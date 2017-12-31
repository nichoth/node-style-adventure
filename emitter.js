var inherits = require('util').inherits
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

