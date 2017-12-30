var EE = require('events').EventEmitter
var bench = require('fastbench')
var S = require('pull-stream')
var Progress = require('../../stream')
var UploadProgress = require('../../emitter')

var run = bench([
    function benchStream (done) {
        var uploads = [new EE(), new EE(), new EE()]
        var progress$ = Progress(uploads)

        S(
            progress$,
            S.drain(function onEvent () {
                done()
            })
        )

        var i = 0
        uploads.forEach(function (ee) {
            process.nextTick(function () {
                ee.emit('httpUploadProgress', { loaded: 1, total: 10 })
                i++
                if (i === uploads.length) progress$.close()
            })
        })
    },

    function benchEmitter (done) {
        var uploads = [ new EE(), new EE(), new EE() ];
        var uploadProgress = UploadProgress(uploads);

        uploadProgress.on('progress', function (data) {
            uploadProgress.close();
            done();
        });

        uploads.forEach(function (up) {
            process.nextTick(function () {
                up.emit('httpUploadProgress', {
                    loaded: 1,
                    total: 10
                });
            });
        });
    }
], 10000)

run(run)

