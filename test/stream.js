var S = require('pull-stream')
var EE = require('events').EventEmitter
var test = require('tape')
var Progress = require('../stream')

test('progress stream', function (t) {
    t.plan(1)
    var uploads = [new EE(), new EE(), new EE()]
    var progress$ = Progress(uploads)

    S(
        progress$,
        S.through(console.log.bind(console)),
        S.collect(function (err, res) {
            if (err) throw err
            t.deepEqual(res, [10])
        })
    )

    uploads.forEach(function (ee) {
        ee.emit('httpUploadProgress', { loaded: 1, total: 10 })
    })

    progress$.close()
})

