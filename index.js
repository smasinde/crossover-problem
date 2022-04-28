const axios = require("axios").default;
const { AsyncResource } = require("async_hooks");
const EventEmitter = require("events");
const path = require("path");

const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
  threadId,
} = require("worker_threads");

const url = new URL(
  process.argv[
    process.argv.findIndex(
      (value) => value.includes("https://") || value.includes("www.")
    )
  ]
);

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
  constructor(numberOfThreads) {
    super();
    this.numberOfThreads = numberOfThreads;
    this.workers = [];
    this.freeWorkers = [];
    this.scanned = new Set();

    for (let i = 0; i < numberOfThreads; i++) {
      this.addNewWorker();
    }
    console.log(`Pool created with ${numberOfThreads} workers(s).`);
  }

  addNewWorker() {
    const worker = new Worker(path.resolve(__dirname, "worker.js"));
    worker.setMaxListeners(0);

    worker.on("message", (result) => {
      this.freeWorkers.push(worker);
      this.emit(kWorkerFreedEvent);
      if (result.size !== 0) {
        result.forEach((link) => {
          if (!this.scanned.has(link))
            this.runTask(link, (e) => console.log(e));
        });
      }
    });
    worker.on("error", (err) => {
      this.freeWorkers.push(worker);
      this.emit(kWorkerFreedEvent);
    });

    this.workers.push(worker);
    this.freeWorkers.push(worker);
    this.emit(kWorkerFreedEvent);
  }

  runTask(task, callback) {
    if (this.scanned.has(task)) {
      return;
    }

    if (this.freeWorkers.length === 0) {
      this.once(kWorkerFreedEvent, function () {
        this.scanned.add(task);
        this.runTask(task, callback);
      });
      return;
    }

    console.log("ADD TASK:::", task);
    this.scanned.add(task);

    const worker = this.freeWorkers.pop();

    worker[kTaskInfo] = new WorkPoolCrawlInfo(callback);

    worker.postMessage({ task: task, scanned: this.scanned, baseUrl: url.href });
  }

  close() {
    for (const worker of this.workers) worker.terminate();
  }
}

const pool = new WorkerPool(50);
pool.setMaxListeners(0);

pool.runTask(url.href);
// pool.runTask(url, () => console.log("**run task callback**"));
