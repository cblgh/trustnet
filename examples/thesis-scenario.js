const { TrustNet } = require("../")
let trustAssignments = []
const distrusted = []
trustAssignments.push({ src: 'alice', dst: 'bob', weight: 0.25 })
trustAssignments.push({ src: 'alice', dst: 'carole', weight: 0.8 })
trustAssignments.push({ src: 'carole', dst: 'david', weight: 0.8 })
trustAssignments.push({ src: 'david', dst: 'carole', weight: 0.8 })
trustAssignments.push({ src: 'carole', dst: 'alice', weight: 0.8 })
trustAssignments.push({ src: 'bob', dst: 'eve', weight: 0.80 })
trustAssignments.push({ src: 'eve', dst: 'mallory', weight: 1.0 })
trustAssignments.push({ src: 'mallory', dst: 'eve', weight: 1.0 })

let trust = new TrustNet()
let root = process.argv.length > 2 ? process.argv[2] : "alice"
trust.load(root, trustAssignments, distrusted).then(() => {
    let mostTrusted = trust.getMostTrusted()
    console.log(`${root}'s most trusted:`, mostTrusted)
    console.log("all trusted", trust.getAllTrusted())
})
