# TrustNet Extras
You found the `extras/` folder. Congratulations!

Honestly, this is just a few tools and some infra I built to aid testing TrustNet, and to create data for my Master's
Thesis so that I could evaluate and analyse the results. 

`simulation.js` is pretty straightforward to use, while `evaluation.js` is something you'll likely have to tweak if you
want to get all the data you need.

## Usage
`<seed>` is a seed that can be passed in to seed the pseudo-random number generator. Useful for reproducible experiments. 

### `simulation.js`
```
trustnet-sim: run the simulator in one of the following ways
  node simulation.js <seed>
  node simulation.js <scenario-filename.json>
  node simulation.js <seed> <scenario-filename.json>
```

### `evaluation.js`
It is fairly well-commented, and has some `console.log` statements that can be toggled on/off as needed. [Read the evaluation section](https://cblgh.org/dl/trustnet-cblgh.pdf#chapter.8) of my thesis for more information (and for the amazingly-named method _influencer accounting_).
``` 
node evaluation.js <seed>
```

### `default-scenario.json`
Contains the parameters used by the simulator `simulation.js` and `evaluation.js`. Most of them are explained in `simulation.js`, or in the [thesis's section _Experiment Design_](https://cblgh.org/dl/trustnet-cblgh.pdf#section.7.3).
