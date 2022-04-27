const axios = require('axios').default;
const { AsyncResource } = require('async_hooks');
const EventEmitter = require('events');
const path = require('path');

const {
    Worker, isMainThread, parentPort, workerData, threadId
} = require('worker_threads');

const url = process.argv[process.argv.findIndex(value => value.includes("https://"))];

axios.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:99.0) Gecko/20100101 Firefox/99.0',
    }
}).then(response => {
    if (response.status === 200) {
        const pool = new WorkerPool(100, url);
        pool.setMaxListeners(0);
        console.log('Pool created..')
        pool.runTask(url, (e) => console.log(e))
    }
})
class WorkPoolCrawlInfo extends AsyncResource {
    constructor(callback) {
        super("WorkPoolCrawlInfo");
        this.callback = callback;
    }

    done(err, result) {
        this.runInAsyncScope(this.callback, null, err, result);
        this.emitDestroy;
    }
}
const kTaskInfo = Symbol("kTaskInfo");
const kWorkerFreedEvent = Symbol("kWorkerFreedEvent");

class WorkerPool extends EventEmitter {
    constructor(numberOfThreads, baseUrl) {
        super();
        this.numberOfThreads = numberOfThreads;
        this.baseUrl = baseUrl;
        this.workers = [];
        this.freeWorkers = [];
        this.scanned = new Set();

        for (let i = 0; i < numberOfThreads; i++) {
            this.addNewWorker();
        }
    }

    addNewWorker() {
        const worker = new Worker(path.resolve(__dirname, 'worker.js'));
        worker.setMaxListeners(0);

        worker.on('message', (result) => {
            // this.close();
            console.log("kFreedEvent");

            this.freeWorkers.push(worker);
            this.emit(kWorkerFreedEvent);
            if (result.size !== 0) result.forEach((link) => { this.runTask(link, e => console.log(e)) });
        });
        worker.on('error', (err) => {
            console.log(err);
            console.log("freeWorker");
            this.freeWorkers.push(worker);
            this.emit(kWorkerFreedEvent);
        })

        this.workers.push(worker);
        this.freeWorkers.push(worker);
        this.emit(kWorkerFreedEvent);
    }

    runTask(task, callback) {
        if (this.scanned.has(task)) {
            return;
        }
        this.scanned.add(task);
        if (this.freeWorkers.length === 0) {
            this.once(kWorkerFreedEvent, () => {
                this.runTask(task, callback)
            });
            return;
        }
        console.log('acquiring worker');
        const worker = this.freeWorkers.pop();

        worker[kTaskInfo] = new WorkPoolCrawlInfo(callback);

        worker.onmessage = function (e) {
            console.log('Message received from worker: , ', e.data)
        }

        worker.postMessage(task);
        console.log('Message posted to worker');
    }

    close() {
        for (const worker of this.workers) worker.terminate();
    }
}