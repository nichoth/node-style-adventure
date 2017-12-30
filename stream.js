var S = require('pull-stream')
var _ = require('pull-stream-util')

function Progress (uploads) {
    var uploads$ = uploads.map(function (up) {
         return _.fromEvent('httpUploadProgress', up)
    })

    var progress$ = S(
        _.combineLatest(uploads$),

        _.scan(function (state, evs) {
            var sum = state.sum || (evs.every(ev => ev.total) ?
                evs.reduce((_sum, ev) => _sum + ev.total, 0) :
                null)

            if (!sum) return state

            var prog = evs.reduce((sum, ev) => sum + ev.loaded, 0)
            return { sum, percent: prog / sum * 100 }
        }, { sum: null, percent: null }),

        S.map(state => state.percent)
    )

    progress$.close = function () {
        uploads$.forEach(up => up.end())
    }

    return progress$
}

module.exports = Progress

