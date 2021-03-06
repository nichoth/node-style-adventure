var test = require('tape');
var Bus = require('events').EventEmitter;
var UploadProgress = require('../emitter')

test('progress event emitter', function (t) {
    t.plan(1);
    var uploads = [ new Bus(), new Bus() ];
    var uploadProgress = UploadProgress(uploads);

    uploadProgress.on('progress', function (data) {
        t.equal(data, 10);
    });

    uploads[0].emit('httpUploadProgress', {
        loaded: 1,
        total: 10
    });

    uploads[1].emit('httpUploadProgress', {
        loaded: 1,
        total: 10
    });

    uploadProgress.once('progress', () => t.fail());
    uploadProgress.close();
    uploads[0].emit('httpUploadProgress', { loaded: 2, total: 10 });
});

