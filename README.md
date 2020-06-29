# TrustNet
_a flexible and distributed system for deriving, and interacting with, computational trust_

TrustNet is a complete trust system that can be incorporated as a ready-made
software component for e.g. distributed ledger technologies, or in a
traditional client-server model, and which provides real value for impacted
users by way of automating decision-making and actions as a result of assigned
trust scores.

TrustNet has support for:
* managing different trust areas, 
* discarding statements from distrusted nodes, and 
* **computing the subjectively most trusted nodes**, as seen from a particular node.

TrustNet is the result of over 1 year of research into systems for transitive and computational trust. [Read the 103-page report](https://cblgh.org/dl/trustnet-cblgh.pdf), or the shorter [blog post](https://cblgh.org/articles/trustnet.html).

See the [`examples/`](./examples/) folder for short snippets on how to use the system.

If you are unfamiliar to the terminology used in this repository, see the **Concepts** section, below.

## Usage
TrustNet can be used either directly, or through the `TrustHandler` class. The `TrustHandler` has an extended API for managing trust across disparate trust areas (such as `moderation` and `music recommendations`, for example). 

See the API section below for the available methods.

```javascript
const { TrustNet } = require("../")

const distrusted = ["eve", "mallory"]
const trustAssignments = []
trustAssignments.push({ src: 'alice', dst: 'bob', weight: 0.25 })
trustAssignments.push({ src: 'alice', dst: 'carole', weight: 0.8 })
trustAssignments.push({ src: 'carole', dst: 'david', weight: 0.8 })
trustAssignments.push({ src: 'david', dst: 'carole', weight: 0.8 })
trustAssignments.push({ src: 'carole', dst: 'alice', weight: 0.8 })
trustAssignments.push({ src: 'bob', dst: 'eve', weight: 0.80 })
trustAssignments.push({ src: 'eve', dst: 'mallory', weight: 1.0 })
trustAssignments.push({ src: 'mallory', dst: 'eve', weight: 1.0 })

const trust = new TrustNet()
const root = process.argv.length > 2 ? process.argv[2] : "alice"
trust.load(root, trustAssignments, distrusted).then(() => {
    let mostTrusted = trust.getMostTrusted()
    console.log(`${root}'s most trusted:`, mostTrusted)
    console.log("all trusted", trust.getAllTrusted())
})
```

## Concepts
TrustNet operates on **trust assignments** issued by nodes, which are typically peers in a peer-to-peer system like [Cabal](https://github.com/cabal-club) or [Secure Scuttlebutt](https://ssb.nz).

A **trust assignment** has a trust source, a trust target (or destination), and a trust weight. It is typically issued within a trust area. See the table below for descriptions of these terms.


| Term | Description					    										|
|-----------------------------------------------------------------------------------|
| **Trust Source**   | The issuer of a trust assignment. 							|
| **Trust Target**   | The target of a trust assignment; the entity being trusted. 	|
| **Trust Weight**   | The amount of trust assigned to trust target.  				|
| **Trust Area**	 | For example: book recommendations, moderation capabilities 	|

The trust assignments TrustNet operates on are of the following form:
```javascript
{ 
	src: 'alice', 
	dst: 'bob', 
	weight: 0.25 
}
```

The trust weight `weight` is a float defined on the range `0.0` - `1.0`, while `src` and `dst` are strings representing unique user identities.

TrustNet takes the trust assignments, and a trust root with id `rootid`, and derives a trust graph. The trust graph is basically the subjective view of the trust assignments from the trust root.
Using this trust graph, and the trust root, we follow the trust assignments stemming out from the root and iteratively calculate trust ranks. The goal is to end up with a subset of the unique identities, represented in the trust assignments, which are regarded as **the most trusted nodes**, as seen from the passed-in trust root.** 


If you want to know more about TrustNet, consider reading:
* [the shorter blog article](https://cblgh.org/articles/trustnet.html), or
* [the longer academic paper](https://cblgh.org/dl/trustnet-cblgh.pdf)

If you want to fund the development of TrustNet, or other independent research, [sponsor me on GitHub](https://github.com/sponsors/cblgh) or [elsewhere](https://cblgh.org/support.html).

# API
Use either `TrustNet`, for a single trust area, or `TrustHandler` if you are managing multiple trust areas: 
```javascript
const { TrustNet, TrustHandler } = require("trustnet") 
const tnet = new TrustNet() // or..
const handler = new TrustHandler(["moderation", "music recommendations"])
```

## `TrustNet(opts)`
### opts.threshold
Default value of `0.50`. Sets the threshold determining which trust assignments are regarded as too low for a accurate trust computation (see meta-ranking trust strategy in paper or article).

**NOTE** As long as there exists at least one direct trust assignment, i.e. issued from the trust source `rootid`, with a trust weight > opts.threshold, **the computation will continue as expected**.

## async TrustNet.load (rootid, assignments, distrusted=[])
Returns a promise. The promise is resolved when the trust computation has finished, and the final trust ranks (based on the passed-in trust assignments) have been determined.

* `rootid` is the id you are viewing the trust graph from, the trust source,
* `assignments` is a list of trust assignments of form `{ src, dst, weight }`. Where `src` and `dst` are strings representing a unique id, and weight is a float in the range `0.0`-`1.0`.
* `distrusted` is an optional list containing ids to discard from the final trust graph, before performing trust computation

## TrustNet.getMostTrusted() 
Synchronous, requires having run `load()` at least once.

Returns the ids of the most trusted nodes, as seen from the trust source passed into `load()`.

## TrustNet.getAllTrusted() 
Synchronous, requires having run `load()` at least once.

Returns the ids of all nodes with a non-zero ranking, as seen from the trust source passed into `load()`.

## TrustNet.getRankings() 
Synchronous, requires having run `load()` at least once.

Returns a mapping of `id -> trust rank` of the most trusted nodes, as seen from the trust source passed into `load()`. Only returns non-zero mappings.

## `TrustHandler(areas=[])`

Also allows passing in areas as an object mapping trust area to its opts, see `TrustNet` for which opts are applicable.

**Example:**
```javascript
const { TrustHandler } = require("trustnet")
const handler = new TrustHandler({ "moderation": { threshold: 0.75 }, "recommendations": { threshold: 0.25 }})
```

## TrustHandler.load = async function (area, rootid, assignments, distrusted=[]) 
 Returns a promise. The promise is resolved when the trust computation has finished, and the final trust ranks (based on the passed-in trust assignments) have been determined.

Same as `TrustNet.load` except it takes an `area`, representing the trust area.
* `area` name of the trust area to perform trust computations for. If the trust area is being added for the first time, a call to `TrustHandler.add(area)` will be issued.

## TrustHandler.getMostTrusted() 
Synchronous, requires having run `load()` or `loadAll()` at least once.

Same as `TrustNet.getMostTrusted` except it takes an `area`, representing the trust area.

Returns the ids of the most trusted nodes, as seen from the trust source passed into `load()`.

## TrustHandler.getAllTrusted() 
Synchronous, requires having run `load()` or `loadAll()` at least once.

Same as `TrustNet.getAllTrusted` except it takes an `area`, representing the trust area.

Returns the ids of all nodes with a non-zero ranking, as seen from the trust source passed into `load()`.

## TrustHandler.getRankings() 
Synchronous, requires having run `load()` or `loadAll()` at least once.

Same as `TrustNet.getRankings` except it takes an `area`, representing the trust area.

Returns a mapping of `id -> trust rank` of the most trusted nodes, as seen from the trust source passed into `load()`. Only returns non-zero mappings.

## TrustHandler.loadAll = async function (areaMapping) 
Returns a promise. The promise is resolved when the trust computation has finished for all passed in trust areas.

* `areaMapping` An object mapping a trust area to the parameters `load` requires

**Example:**
```javascript
const rootid = areaMapping[area].rootid
const assignments = areaMapping[area].assignments
const distrusted = areaMapping[area].distrusted
```

## TrustHandler.add(area, opts=null) 
Adds a new trust area to TrustHandler

* `area` the name of the trust area
* `opts` optional object containing options to pass to `TrustNet`

## TrustHandler.get(area) 
Gets the TrustNet instantiation for the passed in trust area.

* `area` the name of the trust area. `area` should have been added previously during `TrustHandler`'s instatination or via a call to `add()`, `load()`, or `loadAll()`.

## TrustHandler.list() 
Returns a list of all the currently registered trust areas.

## TrustHandler.remove(area) 
Removes a trust area. 

Note: Current implementation of `TrustNet` is lacking a `.destroy()` method. PR adding it welcome.

## Sponsor
If you want to fund the development of TrustNet, or other independent research, [sponsor me on GitHub](https://github.com/sponsors/cblgh) or [elsewhere](https://cblgh.org/support.html).

## License
TrustNet is available for [dual-licensing](https://www.oreilly.com/library/view/open-source-for/0596101198/ch08s07.html). All the code in this repository is licensed as `AGPL3.0-or-later`. If AGPL3 does not work for you, or your organization, contact `cblgh-at-cblgh dotte org` to purchase a more permissive usage license. 

If your project is a not-for-profit project, the permissive license will likely be available at very low-cost :)

