/**
 * 
 * @param {string} seedprompt 
 * @param {Function} cb(data, Err)
 */
function CreateAPI(seedprompt, cb) {
    AssertTypeOf(seedprompt, 'string')

    let ws;
    if (config.ishttps) {
        ws = new WebSocket('wss://' + config.apidomain + "/createapi", localStorage.getItem("X-APINATOR-AUTH"));
    } else {
        ws = new WebSocket('ws://' + config.apidomain + "/createapi", localStorage.getItem("X-APINATOR-AUTH"));
    }

    let projectReference;
    let tempText = "";

    // Define your callback functions
    const info = (message) => {
        console.log(`Info: ${message}`);
    };

    const warning = (message) => {
        console.log(`Warning: ${message}`);
    };

    const ask = (message) => {
        console.log(`Ask: ${message}`);

        writeQuestion(message,
            createTextareaWithPlaceholder("answerarea", "Your response goes here"),
            createSendButtonWithText("answerarea", "Send"));
    };

    const reasoning = (message) => {
        console.log(`Reasoning ${message}`);
        // raw output of llm, it will contain the generated files as
        /*
        FILENAME
        ```LANG
        CODE
        ```
        */

        let snippets = extractSnippets(message);
        for (let i = 0; i < snippets.length; i++) {
            addFile(snippets[i].filename, snippets[i].lang, snippets[i].code);
        }
    };

    ws.onopen = () => {
        console.log("connection open, sending seed prompt");

        ws.send(JSON.stringify({ prompt: seedprompt }));
    };

    ws.onerror = (event) => {
        cb(null, new Err("socketError", "We lost the connection with the backend, please retry later"));
    };

    ws.onmessage = (event) => {
        let message = JSON.parse(event.data);

        if (message.ProjectReference) {
            projectReference = message.ProjectReference;
        }

        if (message.Chunk) {
            tempText += message.Chunk;

            let startIndex, endIndex;
            let sendmessageack = true;

            if ((startIndex = tempText.indexOf('[[[.INFO]]]')) !== -1 && (endIndex = tempText.indexOf('[[[.ENDINFO]]]')) !== -1) {
                info(tempText.substring(startIndex + 11, endIndex));
                tempText = tempText.replace(tempText.substring(startIndex, endIndex + 12), '');
            }

            if ((startIndex = tempText.indexOf('[[[.WARNING]]]')) !== -1 && (endIndex = tempText.indexOf('[[[.ENDWARNING]]]')) !== -1) {
                warning(tempText.substring(startIndex + 13, endIndex));
                tempText = tempText.replace(tempText.substring(startIndex, endIndex + 13), '');
            }

            if ((startIndex = tempText.indexOf('[[[.ASK]]]')) !== -1 && (endIndex = tempText.indexOf('[[[.ENDASK]]]')) !== -1) {
                sendmessageack = false
                ask(tempText.substring(startIndex + 9, endIndex));
                tempText = tempText.replace(tempText.substring(startIndex, endIndex + 10), '');
            }

            if ((startIndex = tempText.indexOf('[[[.REASONING]]]')) !== -1 && (endIndex = tempText.indexOf('[[[.ENDREASONING]]]')) !== -1) {
                reasoning(tempText.substring(startIndex + 13, endIndex));
                tempText = tempText.replace(tempText.substring(startIndex, endIndex + 13), '');
            }

            if (sendmessageack) {
                // Send ack message after receiving a chunk
                ws.send(JSON.stringify({ ack: true }));
            }

            // if (tempText.includes('[[[.FINALEND]]]')) {
            //     ws.close();
            // }
        }

        if (message.Finished) {
            ws.send(JSON.stringify({ ack: true }));
            ws.close();

            cb({}, null);
        }
    };

    return ws;
}

function extractSnippets(text) {
    let pattern = /(\w+\.?\w*)\s*```(\w+)\s*([\s\S]*?)\s*```/g;
    let match;
    let snippets = [];
    
    while ((match = pattern.exec(text)) !== null) {
        snippets.push({
            filename: match[1],
            lang: match[2],
            code: match[3].trim(),
        });
    }
    
    return snippets;
}