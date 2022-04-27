const { parentPort, threadId } = require('worker_threads');
const axios = require('axios').default;
const { parse } = require('node-html-parser');

parentPort.on('message', async (task) => {
    console.log('Message received from main script, threadNumber:', threadId);

    await axios.get(task, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:99.0) Gecko/20100101 Firefox/99.0',
        }
    }).then(response => {
        let linkSet = new Set();
        console.log("doing work..");
        if (response.status === 200){
            const html = response.data;
            const root = parse(html);
            const links = root.getElementsByTagName("a");

            for (let link of links) {
                let href = link.getAttribute("href");
                console.log("HREF::::::::",href);
                if (String(href).startsWith("/")) {
                    linkSet.add(task.concat("", href))
                } else if (String(href).includes(task) && String(href) !== process.argv[process.argv.findIndex(value => value.includes("https://"))]) {
                    linkSet.add(href);
                }
            }
            parentPort.postMessage(linkSet);
        }
    }).catch(e => {
        console.log("Worker error:",e.response.status);
        parentPort.postMessage(new Set());
    })
    
})
// parentPort.on('message', (task) => {
//     console.log(`running task on thread: ${threadId} with link: ${task}`);
    
//     parentPort.postMessage(task);
// })