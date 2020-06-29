function debug (node, arr, label) {
    let prev, curr
    if (typeof arr[0] === "object") {
        prev = (node in arr[0]) ? arr[0][node] : "N/A"
        curr = (node in arr[1]) ? arr[1][node] : "N/A"
    } else {
        prev = arr[0]
        curr = arr[1]
    }
    console.log(label, `(${node})`)
    console.log("previous:", prev)
    console.log("current:", curr)
    console.log()
}


// create a safe, reference-less duplicate of what was passed in
function dupe (o) {
    return Object.assign({}, o)
}

function rank2id (rank, rankings) {
    let entries = Object.entries(rankings)
    for (let i = 0; i < entries.length; i++) {
        let entry = entries[i]
        if (Math.abs(entry[1] - rank) < 0.005) { return entry[0] } // found the corresponding id
    }
    return null
}

function initialiseObject (keys, initVal) {
    let o = {}
    keys.forEach((k) => { o[k] = initVal })
    return o
}

function printRankings (d, source) {
    delete d[source] // remove source from trust rankings (it will be 0)
    let rankings = Object.entries(d).sort((a, b) => a[1] - b[1] < 0)
    rankings.forEach((r) => {
        console.log(`${r[0]}: ${r[1]}`)
    })
}

function edgesToRankedForm (edges) {
    let rankings = {}
    for (let e of edges) {
        rankings[e.dst] = e.weight
    }
    return rankings
}

module.exports = { rank2id, debug, dupe, initialiseObject, printRankings, edgesToRankedForm }
