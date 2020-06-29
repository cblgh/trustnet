const TrustNet = require("./index.js")

function TrustHandler (areas=[]) {
    if (!(this instanceof TrustHandler)) return new TrustHandler(areas)
    this.trustAreas = {}
    // trustAreas was passed in as a list
    if (typeof areas[Symbol.iterator] === "function") {
        areas.forEach((area) => this.add(area))
    } else if (typeof areas === "object") {
        // trustAreas was passed in as mapping of {area: TrustNet opts}
        Object.entries(areas).forEach((area, opts) => this.add(area, opts))
    } 
}

TrustHandler.prototype.add = function (area, opts=null) {
    let tnet = new TrustNet(opts)
    this.trustAreas[area] = tnet
    return tnet
}

TrustHandler.prototype.loadAll = async function (areaMapping) {
    const promises = Object.keys(areaMapping).map((area) => {
        const rootid = areaMapping[area].rootid
        const assignments = areaMapping[area].assignments
        const distrusted = areaMapping[area].distrusted
        return this.load(area, rootid, assignments, distrusted)
    })
    return Promises.all(promises)
}

TrustHandler.prototype.load = async function (area, rootid, assignments, distrusted=[]) {
    if (!this.trustAreas[area]) this.add(area)
    return this.trustAreas[area].load(rootid, assignments, distrusted)
}

TrustHandler.prototype.getMostTrusted = function (area) {
    area = this._processArea(area)
    if (!area) return null
    return this.get(area).getMostTrusted() 
}

TrustHandler.prototype.getRankings = function (area) {
    area = this._processArea(area)
    if (!area) return null
    return this.get(area).getRankings() 
}

TrustHandler.prototype.getAllTrusted = function (area) {
    area = this._processArea(area)
    if (!area) return null
    return this.get(area).getAllTrusted() 
}

// handle parameter-less calls to the trust handler. can be useful if there's only a single trust area
TrustHandler.prototype._processArea = function (area) {
    if (typeof area === "undefined" || !this.trustAreas[area]) {
        const areas = this.list()
        if (areas.length === 0 || areas.length > 1) return null
        return areas[0]
    }
}

TrustHandler.prototype.get = function (area) {
    return this.trustAreas[area] || null
}

TrustHandler.prototype.list = function () {
    return Object.keys(this.trustAreas).sort()
}

TrustHandler.prototype.remove = function (area) {
    // TODO: add destroy method to trustnet?
    delete this.trustAreas[area]
}

module.exports = TrustHandler
