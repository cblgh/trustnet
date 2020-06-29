const fs = require("fs")
const path = require("path")
const seedrandom = require("seedrandom")
const { TrustNet } = require("../")

function initialise (config, chosenSeed) {
    const scenario = JSON.parse(fs.readFileSync(path.join(__dirname, `${config}`)))
    let seed = parseInt(chosenSeed || scenario.seed)
    const prng = seedrandom(seed)
    // simulation variables
    // trust is of the format:
    /* 
    { none: 0,
      low: 0.25,
      medium: 0.50,
      high: 0.75,
      absolute: 1.00
    } */
    let trust = scenario.trust.levels 
    // skew: how much to skew the trust assignments, percentually. has to sum up to 1.0
    // skew has the format:
    /*
    { untrusted: 0.00,
      low: 0.40, 
      medium: 0.10,
      high: 0.50, 
      absolute: 0 
    } */
    let skew = scenario.trust.skew
    let nodeCount = scenario.nodes
    // the permissible range of trust assignments per node
    let trustRange = scenario.trust.range

    // assign trust according to the skew probabilities
    function assignTrust () {
        let roll = prng()
        if (roll <= skew.untrusted) return trust.none
        else if (roll <= skew.untrusted + skew.low) return trust.low
        else if (roll <= skew.untrusted + skew.low + skew.medium) return trust.medium
        else if (roll <= skew.untrusted + skew.low + skew.medium + skew.high) return trust.high
        return trust.absolute
    }

    // init nodes, ids
    let nodes = new Array(nodeCount).fill(0).map((_, i) => {
        return { name: i }
    })
    let ids = nodes.map((n) => n.name)

    nodes.forEach((node) => {
        // temporarily remove the iterated node from the ids 
        ids.splice(node.name, 1)
        node.assignments = []
        let assignmentCount = Math.floor(prng() * (trustRange.high - trustRange.low + 1) + trustRange.low)
        // seeding node should never have 0 outgoing assignments
        if (node.name === 0 && assignmentCount === 0) {
            assignmentCount = trustRange.high
        }
        for (let i = 0; i < assignmentCount; i++) {
            let idindex = Math.floor(prng() * ids.length)
            let nodeid = ids.splice(idindex, 1)[0]
            node.assignments.push({ src: `${node.name}`, dst: `${nodeid}`, weight: assignTrust() })
        }
        // refresh ids
        ids = nodes.map((n) => n.name)
    })

    function collectAssignments (arr) {
        let res = []
        arr.forEach((n) => { res = res.concat(n.assignments) })
        return res
    }
    return {nodes, assignments: collectAssignments(nodes)}
}

if (process.argv[1] === __filename) {
    let seed = 1
    let scenarioFilename = "default-scenario.json"
    if (process.argv.length === 3) {
        if (process.argv[2].endsWith("json")) {
            scenarioFilename = process.argv[2]
        } else if (["-h", "--help"].includes(process.argv[2])) {
            console.error("trustnet-sim: run the simulator in one of the following ways")
            console.error("  node simulation.js <seed>")
            console.error("  node simulation.js <scenario-filename.json>")
            console.error("  node simulation.js <seed> <scenario-filename.json>")
            process.exit(0)
        } else {
            seed = process.argv[2]
        }
    } else if (process.argv.length > 3) {
        scenarioFilename = process.argv[2]
        seed = process.argv[3]
    }

    let scenario = initialise(scenarioFilename, seed)
    let tnet = new TrustNet()
    tnet.load('0', scenario.assignments).then(() => {
        let mostTrusted = tnet.getMostTrusted()
        console.log("rankings", tnet.getRankings())
        console.log("most trusted", mostTrusted)
    })
}

module.exports = initialise
