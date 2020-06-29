let test = require("tape")
const { TrustNet } = require("../")

test("test passes", (t) => {
    t.plan(1)
    t.pass("this test passes")
})

test("instantiation should work", (t) => {
    let trust = TrustNet()

    t.pass("smoke test doesn't crash :^)")
    t.end()
})

test("should detect if is first order graph", (t) => {
    let trustAssignments = []
    trustAssignments.push({ src: 'a', dst: 'b', weight: 0.75 })
    trustAssignments.push({ src: 'a', dst: 'c', weight: 0.50 })
    trustAssignments.push({ src: 'b', dst: 'd', weight: 0.75 })
    trustAssignments.push({ src: 'b', dst: 'e', weight: 0.50 })
    trustAssignments.push({ src: 'c', dst: 'e', weight: 0.50 })
    trustAssignments.push({ src: 'c', dst: 'f', weight: 0.50 })
    trustAssignments.push({ src: 'd', dst: 'g', weight: 0.50 })
    trustAssignments.push({ src: 'f', dst: 'h', weight: 0.50 })

    let trust = TrustNet()
    t.false(trust._isFirstOrderGraph("a", trustAssignments), "graph is not a first order graph")
    trustAssignments = []
    trustAssignments.push({ src: 'a', dst: 'b', weight: 0.75 })
    trustAssignments.push({ src: 'a', dst: 'c', weight: 0.50 })
    t.true(trust._isFirstOrderGraph("a", trustAssignments), "graph is a first order graph (consist only of direct edges from root)")

    trustAssignments = []
    trustAssignments.push({ src: 'a', dst: 'b', weight: 0.75 })
    trustAssignments.push({ src: 'c', dst: 'd', weight: 0.50 })
    trustAssignments.push({ src: 'c', dst: 'e', weight: 0.50 })
    trustAssignments.push({ src: 'd', dst: 'f', weight: 0.50 })
    t.true(trust._isFirstOrderGraph("a", trustAssignments), "graph is a first order graph (disjoint edges)")
    trust._firstOrderRankings("a", trustAssignments)
    t.end()
})

test("trust calculation for more than 3 nodes should work", (t) => {
    let trustAssignments = []
    trustAssignments.push({ src: 'a', dst: 'b', weight: 0.75 })
    trustAssignments.push({ src: 'a', dst: 'c', weight: 0.50 })
    trustAssignments.push({ src: 'b', dst: 'd', weight: 0.75 })
    trustAssignments.push({ src: 'b', dst: 'e', weight: 0.50 })
    trustAssignments.push({ src: 'c', dst: 'e', weight: 0.50 })
    trustAssignments.push({ src: 'c', dst: 'f', weight: 0.50 })
    trustAssignments.push({ src: 'd', dst: 'g', weight: 0.50 })
    trustAssignments.push({ src: 'f', dst: 'h', weight: 0.50 })

    let trust = TrustNet()
    trust.load("a", trustAssignments).then(() => {
        let mostTrusted = trust.getMostTrusted()
        t.true(mostTrusted.includes("b"))
        t.true(mostTrusted.includes("d"))
        t.true(mostTrusted.includes("c"))
    })
    t.end()
})

test("trust calculation for fewer than 3 nodes should work", (t) => {
    let trustAssignments = []
    trustAssignments.push({ src: 'a', dst: 'b', weight: 0.75 })
    trustAssignments.push({ src: 'a', dst: 'c', weight: 0.75 })
    trustAssignments.push({ src: 'a', dst: 'd', weight: 0.25 })

    let trust = TrustNet()
    trust.load("a", trustAssignments).then(() => {
        let mostTrusted = trust.getMostTrusted()
        t.equals(mostTrusted.length, 3, "amount of most trusted peers is 3")
        t.true(mostTrusted.includes("b"))
        t.true(mostTrusted.includes("c"))
        t.true(mostTrusted.includes("d"))
    })
    t.end()
})

test("should get all first order trusted nodes correctly", (t) => {
    let trustAssignments = []
    trustAssignments.push({ src: 'a', dst: 'b', weight: 0.75 })
    trustAssignments.push({ src: 'a', dst: 'c', weight: 0.75 })
    trustAssignments.push({ src: 'a', dst: 'd', weight: 0.25 })
    trustAssignments.push({ src: 'b', dst: 'c', weight: 0.25 })

    let trust = TrustNet()
    let firstOrder = trust._getFirstOrderEdges("a", trustAssignments).map((e) => e.dst)
    t.true(firstOrder.length === 3)
    t.true(firstOrder.includes("b"))
    t.true(firstOrder.includes("c"))
    t.true(firstOrder.includes("d"))
    t.end()
})
