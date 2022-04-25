const { parentPort, threadId } = require('worker_threads');
const axios = require('axios').default;
const { parse } = require('node-html-parser');

parentPort.on('message', (task) => {
    console.log('Message received from main script');

    axios.get(task, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:99.0) Gecko/20100101 Firefox/99.0',
        }
    }).then(response => {
        let linkSet = new Set();
        
        if (response.status === 200){
            const html = response.data;
            const root = parse(html);
            const links = root.getElementsByTagName("a");

            for (let link of links) {
                let href = link.getAttribute("href");

                if (String(href).startsWith("/")) {
                    linkSet.add(task.concat("", href))
                } else if (String(href).includes(task)) {
                    linkSet.add(href);
                }
            }
            console.log(linkSet);
            parentPort.postMessage(linkSet);
        }
    })
    
})
// parentPort.on('message', (task) => {
//     console.log(`running task on thread: ${threadId} with link: ${task}`);
    
//     parentPort.postMessage(task);
// })