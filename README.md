Take multiple s3 uploads, and return progress events for the total progress for all the uploads combined. Each s3 upload object emits events like `{ loaded: 1, total 10 }`, but `total` may be undefined because it has not yet been calculated.

## Event emitter

<details>

```js
var inherits = require('inherits')
var EE = require('events').EventEmitter

// take multiple s3 uploads and return a single event emitter with
// total progress
function UploadProgress (uploads) {
    if (!(this instanceof UploadProgress)) {
        return new UploadProgress(uploads);
    }
    this.uploads = uploads;
    var bus = this;
    var totals = uploads.map(() => null);
    var sum;
    var progresses = uploads.map(() => 0);
    var isReady = false;

    this._stateListeners = [];
    this._progressListener = emitProgress;
    var self = this;

    uploads.forEach(function (upload, i) {
        self._stateListeners.push(getState);
        upload.on('httpUploadProgress', getState);
        function getState (data) {
            progresses[i] = data.loaded;
            if (data.total) totals[i] = data.total;
            if (totals.every(Boolean)) {
                isReady = true;
                sum = totals.reduce((_sum, n) => _sum + n);
            }
        }
    });

    // emit the overall progress
    var prev;
    uploads.forEach(function (upload, i) {
        upload.on('httpUploadProgress', emitProgress);
    });

    function emitProgress (data) {
        if (!isReady) return;
        var prog = progresses.reduce((acc, n) => acc + n);
        var percent = Math.floor(prog / sum * 100);
        if (prev === percent) return;
        prev = percent;
        bus.emit('progress', percent);
    }

    EE.call(this);
}
inherits(UploadProgress, EE);

UploadProgress.prototype.close = function () {
    var self = this;
    this.uploads.forEach(function (upload, i) {
        upload.removeListener('httpUploadProgress', self._stateListeners[i]);
        upload.removeListener('httpUploadProgress', self._progressListener);
    });
    this.removeAllListeners();
};

module.exports = UploadProgress;
```

</details>



## pull stream

<details>

```js
var S = require('pull-stream')
var _ = require('pull-stream-util')

function Progress (uploads) {
    var uploadStreams = uploads.map(_.fromEvent('httpUploadProgress'))

    var progress$ = S(
        _.combineLatest(uploadStreams),

        _.scan(function (state, evs) {
            var sum = state.sum || (evs.every(ev => ev.total) ?
                evs.reduce((_sum, ev) => _sum + ev.total, 0) :
                null)

            if (!sum) return state

            var prog = evs.reduce((sum, ev) => sum + ev.loaded, 0)
            return { sum, percent: Math.floor(prog / sum * 100) }
        }, { sum: null, percent: null }),

        S.filter(state => state.sum),
        S.map(state => state.percent)
    )

    progress$.close = function () {
        uploadStreams.forEach(up => up.end())
    }

    return progress$
}

module.exports = Progress
```

</details>

## benchmark

Which will be faster? What is a good way to test this? [/test/bench/index.js](/test/bench/index.js)

<details>

```
benchStream*10000: 463.748ms
benchEmitter*10000: 255.184ms
benchStream*10000: 499.722ms
benchEmitter*10000: 276.881ms
```

</details>

