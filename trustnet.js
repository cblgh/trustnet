const stats = require("simple-statistics")
const appleseed = require("appleseed-metric")
const Graph = require("trustnet-graph")
const debug = require("debug")("trustnet")
const util = require("./util.js")

module.exports = TrustNet

function TrustNet (opts) {
    opts = opts || {}
    if (!(this instanceof TrustNet)) return new TrustNet(opts)
    // the source to compute trust graph from
    this.rootid = null
    // the computed rankings, as seen from this.rootid
    this.rankings = null 
    // the graph of trust assignments
    this.graph = null
    // true if the trust graph only consists of direct assignments, i.e. it is without transitive trust
    this.isFirstOrder = true
    // used for highOnlyStrategy. if there are no direct trust assignments > threshold -> return empty list in getMostTrusted
    // rationale: if none of the trust source's direct trust assignments are greater than the threshold then the
    // resulting rankings will be misrepresentative; too much energy will be distributed to nodes which would not
    // necessarily be trusted
    this.trustThreshold = opts.threshold || 0.50
}

TrustNet.prototype.load = async function (rootid, assignments, distrusted=[]) {
    this.rootid = `${rootid}` // force to string
    // filter out distrusted nodes
    let trustAssignments = assignments.filter((t) => !distrusted.includes(t.src) && !distrusted.includes(t.dst))
    this.isFirstOrder = this._isFirstOrderGraph(this.rootid, trustAssignments)
    if (this.isFirstOrder) {
        debug("only first order graph. skip")
        this.graph = Graph(trustAssignments)
        this.rankings = this._firstOrderRankings(this.rootid, trustAssignments)
        return
    }
    debug("trustAssignments %O", assignments)
    debug("distrusted ids %O", distrusted)
    let result = await appleseed(this.rootid, trustAssignments, 200, 0.85, 0.01)
    this.rankings = result.rankings
    debug("rankings %O", this.rankings)
    this.graph = result.graph
}

TrustNet.prototype.getMostTrusted = function () {
    if (this.rootid) {
        debug("most trusted for", this.rootid)
    }
    if (this.rankings === null) return []
    return Object.keys(this._highOnlyStrategy())
}

TrustNet.prototype.getRankings = function () {
    if (this.rankings === null) return {}
    const nonzeroRankings = Object.keys(this.rankings).reduce((obj, key) => {
        const rank = parseFloat(this.rankings[key]) 
        if (rank > 0) obj[key] = rank
        return obj
    }, {})
    debug("get rankings %O", nonzeroRankings)
    return nonzeroRankings
}

TrustNet.prototype.getAllTrusted = function () {
    // return all entries with some non-zero measure of trust (ranking > 0), and add the rootid as well
    return Object.entries(this.rankings).filter((e) => e[1] > 0).map((e) => e[0]).concat(this.rootid)
}

function getBreaks (rankings, breaks) {
    let scores = Object.values(rankings)
    if (scores.length < breaks) {
        breaks = scores.length
    }
    let trustGroups = stats.ckmeans(scores, breaks)
    return { groups: trustGroups, breaks }
}

function naiveHighTrustStrategy (rankings) {
    const tweakedRankings = Object.assign({}, rankings)
    // insert a sentinel with a ranking of 0, that way we always have at least one value in the cluster of lowest values.
    // helps to avoid sorting away useful values when total # of ranks is low
    const sentinel = `sentinel-${+(new Date())}`
    tweakedRankings[sentinel] = 0
    debug("rankings", rankings)
    let { groups, breaks } = getBreaks(tweakedRankings, 3)
    // filter out sentinel, and participants with no trust
    groups[0] = groups[0].filter((n) => n > 0)
    debug("groups", groups)
    debug("breaks", breaks)
    // exclude lowest trusted group; merge the other two clusters and use as result
    // rationale: we exclude the lowest trusted group as that is the least relevant part of the ranked trust graph.
    // the other two clusters contain direct trust assignments issued from the trust source, as well as nodes which are
    // highly regarded in their personal trust network
    let highestGroup = groups[groups.length-1].concat(groups[groups.length-2])
    debug("highest group %O", highestGroup)
    let result = {}
    // now we need to remap the values we used for clustering to their actual ids
    // make a copy of the rankings as we'll be deleting the seen rank and id couples
    // to prevent matching the same id twice if the rank ends up being the same
    let rankingsCopy = Object.assign({}, rankings)
    for (let rank of highestGroup) {
        let id = util.rank2id(rank, rankingsCopy)
        delete rankingsCopy[id]
        result[id] = rank
    }
    debug("high trust strategy result: %O", result) 
    return result
}

// non-naive version accounts for initial context of the source node's trust assignments
// if source hasn't issued any high-trust assignments, appleseed's top rankings will be
// misleading
TrustNet.prototype._highOnlyStrategy = function () {
    debug("entering high only strategy")
    let hasHighTrust = false
    const highTrustEdges = []
    for (let edge of this.graph.outEdges(this.rootid)) {
        if (edge.weight >= this.trustThreshold) {
            highTrustEdges.push(edge)
        }
    }
    // collect the first order edges with a non-zero positive trust weight
    const firstOrderEdges = this.graph.outEdges(this.rootid).filter((n) => n.weight > 0)
    // transform first order edges into nodes
    const firstOrderNodes = firstOrderEdges.map((n) => n.dst)
    // merge an array of objects with another object
    function merge (obj, arrayOfObj) {
        const newObj = Object.assign({}, obj)
        arrayOfObj.forEach((o) => { obj = Object.assign(newObj, o) })
        return newObj
    }
    let result = {}
    // there were no high trust assignments originating from the source, or we were operating on a first order (no transitive edges) graph
    // => the highest rankings from appleseed aren't trustworthy enough. only return first order edges
    if (highTrustEdges.length === 0) { 
        debug("no high trust edges, returning missing rankings")
        return merge(result, this._getMissingRankingsList(firstOrderNodes))
    } else if (this.isFirstOrder) { 
        debug("first order graph, returning edges to ranked form")
        return util.edgesToRankedForm(firstOrderEdges) 
    }

    result = naiveHighTrustStrategy(this.rankings)
    // now we need to do some extra processing to ensure that *all* the first order edges are returned. 
    // rationale: they have been trusted firsthand by this.rootid => i.e. they are one of the most trusted (it's just
    // they might be low trusted, due to their poor judgement - they themselves *are* trusted, though)
    
    // i *might* have read a small article on functional programming before writing the following lines..
    const appleseedNodes = Object.keys(result)
    const missingFirstOrderNodes = firstOrderNodes.filter((n) => !appleseedNodes.includes(n))
    // extend result with all of the missing first order nodes, carrying over their rankings
    const missingEdgesRanked = this._getMissingRankingsList(missingFirstOrderNodes)
    debug("fully computed, returning augmented appleseed edges")
    return merge(result, missingEdgesRanked)
}

TrustNet.prototype._isFirstOrderGraph = function (root, assignments) {
    const g = Graph(assignments)
    debug("isFirstOrder: root's outgoing edges %O", g.outEdges(root))
    const outgoingNodes = g.outEdges(root).filter((e) => e.weight > 0).map((e) => e.dst)
    debug("isFirstOrder: root's filtered outgoing nodes %O", outgoingNodes)
    // traverse the root's outgoing edges. for each destination node, see if *it* has any outgoing edges. 
    // if a node does have outgoing edges, our graph has a  depth greater than 1
    for (const node of outgoingNodes) {
        const edges = g.outEdges(node)
        debug("isFirstOrder edges %O", edges)
        if (edges.length > 0 && edges.filter((e) => e.weight > 0 && e.dst !== root).length > 0) return false
    }
    // otherwise, if we can't find any such nodes, return true
    return true
}

TrustNet.prototype._getMissingRankingsList = function (nodes) {
    return nodes.map((n) => { 
        let o = {}
        o[n] = this.rankings[n] || -1
        return o
    })
}

TrustNet.prototype._getFirstOrderEdges = function (rootid, assignments) {
    let g = Graph(assignments)
    return g.outEdges(rootid)
}

TrustNet.prototype._getFirstOrderNodes = function (g, rootid) {
    return g.outEdges(rootid).map((e) => e.dst)
}

TrustNet.prototype._firstOrderRankings = function (rootid, assignments) {
    const edges = this._getFirstOrderEdges(rootid, assignments)
    return util.edgesToRankedForm(edges)
}
