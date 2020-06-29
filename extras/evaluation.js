/* evaluating TrustNet */
const generator = require("./simulation.js")
const TrustNet = require("../index.js")
function evaluate (seed) {
  // run the scenario generator to generate a random network of nodes, each with their own trust graph
  const scenario = generator("default-scenario.json", seed)
  // tree contains mappings of influencers -> nodes they can influence (i.e. a trusted node -> the nodes that trust it)
  const tree = {}
  const tnets = {}
  // collect all of the ids in the network
  const ids = scenario.nodes.map((n) => n.name)
  const promises = []
  // console.log(scenario.assignments.length)
  // for each node in the network, get their trusted peers
  scenario.nodes.forEach((node) => {
    tnets[node.name] = new TrustNet()
    const promise = new Promise((res, rej) => {
      tnets[node.name].load(node.name, node.assignments).then(() => {
        // for each trusted peer
        tnets[node.name].getMostTrusted().forEach((trusted) => {
          if (!tree[trusted]) tree[trusted] = new Set()
          // make a note that the current node trusts them
          tree[trusted].add(node.name)
        })
        res()
      })
    })
    promises.push(promise)
  })
  Promise.all(promises).then(() => { 
    const influencers = Object.keys(tree).map((trusted) => { return { id: trusted, count: tree[trusted].size } })
    // update the number of remaining nodes the influencers in arr can influence
    function updateCount (arr, remaining) {
      // let intersection = new Set([...set1].filter(x => set2.has(x)))
      for (let i = 0; i < arr.length; i++) {
        const intersection = Array.from(tree[arr[i].id]).filter(x => remaining.has(x))
        arr[i].count = intersection.length
      }
    }

    function cmp (first, second) {
      return parseInt(second.count) - parseInt(first.count)
    }

    influencers.sort(cmp) 
    // make a copy of all of the ids. uncovered contains all ids of nodes not currently covered by an issued trust assignment
    const uncovered = new Set(ids.slice())
    // issue trust assignments starting from the nodes with the most coverage (i.e. most nodes trusting them) and
    // then work our way down
    let actions = 0
    let useless = false
    // continue as long as influencers can still issue actions that affect other nodes
    while (!useless) {
      // update each influencer to see how many of the remaining nodes they can still influence
      updateCount(influencers, uncovered)
      // sort the influencers, placing the one with the most influence at the top
      influencers.sort(cmp)
      // grab the most productive influencer
      const trusted = influencers[0]
      if (!tree[trusted.id]) continue
      useless = true // set a sentinel value: if the top influencer can't do anything, we only have individual actions to issue
      // go through the nodes the top influencer will influence (the ones that trust the influencer)
      tree[trusted.id].forEach((i) => {
        // if they 
        if (uncovered.has(i)) {
          uncovered.delete(i)
          useless = false
        }
      })
      // remove the top influencer, they have influenced everyone they can 
      influencers.splice(influencers.indexOf(trusted.id), 1)
      actions += 1
      // console.log("actions:", actions)
      // console.log("uncovered count", uncovered.size)
    }
    actions += uncovered.size
    // console.log("final (unoptimized) **mute** count:", actions)
    console.log(actions)
  })
}

// accept the seed parameter, otherwise use the one in the scenario config
if (process.argv.length > 2) evaluate(parseInt(process.argv[2]))
else evaluate()
