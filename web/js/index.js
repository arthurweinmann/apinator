function GlobalInit() {
    if (localStorage.getItem("X-APINATOR-AUTH") === null) {
        document.querySelector(".signinpopup").style.display = "block";
        logininit();
    } else {
        start();
    }
}

function start() {
    writeQuestion("What would you like to work on today?",
        createTextareaWithPlaceholder("specarea", "Your specification goes here"),
        createSendButtonWithText("specarea", "Send"));
}

function writeQuestion(question, ...actioncontent) {
    document.querySelector(".question").innerHTML = question;
    document.querySelector(".question-action").innerHTML = "";
    for (const elem of actioncontent) {
        document.querySelector(".question-action").appendChild(elem);
    }
}

function createTextareaWithPlaceholder(id, placeholderText) {
    var textarea = document.createElement("textarea");
    textarea.placeholder = placeholderText;
    textarea.setAttribute("id", id);
    return textarea;
}

var createAPISock = null;

function createSendButtonWithText(getTextFromID, buttonText) {
    var button = document.createElement("button");
    button.innerHTML = buttonText;
    button.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (createAPISock === null) {
            createAPISock = CreateAPI(document.getElementById(getTextFromID).value, function (data, err) {
                console.log(data, err);
            });
            return;
        }

        createAPISock.send(JSON.stringify({ ack: true, response: document.getElementById(getTextFromID).value }));
    });
    return button;
}

function logininit() {
    var button = document.getElementById("signinButton");
    var input = document.getElementById("signinValue");

    document.body.style.overflow = "hidden"

    // const testpassword = function (callback) {
    //     fetch(config.apidomain + "/", {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json'
    //         },
    //         body: JSON.stringify(config) // If you want to send data from config to server
    //     })
    //     .then(response => {
    //         if (!response.ok) {
    //             throw new Error(`HTTP error! status: ${response.status}`);
    //         }
    //         return response.json();
    //     })
    //     .then(data => {
    //         if (data.success === true) {
    //             callback(null, data);
    //         } else {
    //             callback(new Error('Success is not true'));
    //         }
    //     })
    //     .catch(error => {
    //         callback(error);
    //     });
    // };

    const testpassword = async (password, cb) => {
        try {
            const response = await fetch("https://" + config.apidomain + "/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-APINATOR-AUTH': password
                },
                body: JSON.stringify({})
            });

            try {
                const data = await response.json();

                if (data.success === true) {
                    cb(true, null);
                } else {
                    cb(null, new Err("invalidPassword", "The provided password is not valid"));
                }
            } catch (e) {
                cb(null, new Err("invalidPassword", `HTTP error! status: ${response.status}, ${e}`));
                return
            }
        } catch (error) {
            cb(null, new Err("invalidPassword", "Error trying to check password: " + error));
        }
    };

    button.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var value = input.value;
        testpassword(value, function (data, err) {
            if (err !== null) {
                alert(err.Message);
                return;
            }

            localStorage.setItem("X-APINATOR-AUTH", value);

            document.querySelector(".signinpopup").style.display = "none";
            document.body.style.overflow = "visible";
            start();
        });
    });

    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();

            var value = input.value;
            testpassword(value, function (data, err) {
                if (err !== null) {
                    alert(err.Message);
                    return;
                }

                localStorage.setItem("X-APINATOR-AUTH", value);

                document.querySelector(".signinpopup").style.display = "none";
                document.body.style.overflow = "visible";
                start();
            });
        }
    });
}

var editorInit = false;
var editorInstance = null;

function addFile(path, language, content) {
    let model = window.boxedMonaco.editor.createModel(content, language, "file://"+path);

    if (!editorInit) {
        setupFilesystem();

        editorInstance = window.boxedMonaco.editor.create(document.querySelector('.code'), {
            model: model,
            scrollbar: {
                vertical: 'auto',
                horizontal: 'auto'
            },
            theme: "vs-dark",
            automaticLayout: true,
        });

        editorInit = true;
    } else {
        editorInstance.setModel(model);
    }

    // normalize path
    if (path.endsWith('/')) {
        path = path.slice(0, -1);
    }
    if (path.startsWith('/')) {
        path = path.slice(1);
    }
    let spl = path.split('/');

    let root = document.getElementById('hierarchy');

    for (let i = 0; i < spl.length - 1; i++) { // adjusted to not include file
        let found = false;

        for (let child of root.children) {
            if (child.firstChild.textContent === spl[i]) {
                root = child;
                found = true;
                break;
            }
        }

        if (!found) {
            let newFolder = document.createElement('div');
            newFolder.className = 'foldercontainer';

            let folderSpan = document.createElement('span');
            folderSpan.className = 'folder fa-folder';
            folderSpan.setAttribute("data-isexpanded", "true");
            folderSpan.textContent = spl[i];

            newFolder.appendChild(folderSpan);
            root.appendChild(newFolder);
            root = newFolder;
        }
    }

    let fileSpan = document.createElement('span');
    fileSpan.className = 'file fa-file-code-o';  // assuming code file, change accordingly
    fileSpan.textContent = spl[spl.length - 1]; // file name from path
    fileSpan.setAttribute("path", "file://"+path);
    root.appendChild(fileSpan);
    // fileSpan.addEventListener("click", function(e) {
    //     let model = window.boxedMonaco.editor.getModel("file://"+path);
    //     editorInstance.setModel(model);
    // });
}

function setupFilesystem() {
    var hierarchy = document.getElementById("hierarchy");
    hierarchy.addEventListener("click", function (event) {
        var elem = event.target;
        if (elem.tagName.toLowerCase() == "span" && elem !== event.currentTarget) {
            var type = elem.classList.contains("folder") ? "folder" : "file";
            
            if (type == "file") {
                let model = window.boxedMonaco.editor.getModel(elem.getAttribute("path"));
                editorInstance.setModel(model);
            }
            
            if (type == "folder") {
                var isexpanded = elem.dataset.isexpanded == "true";
                if (isexpanded) {
                    elem.classList.remove("fa-folder-o");
                    elem.classList.add("fa-folder");
                }
                else {
                    elem.classList.remove("fa-folder");
                    elem.classList.add("fa-folder-o");
                }
                elem.dataset.isexpanded = !isexpanded;

                var toggleelems = [].slice.call(elem.parentElement.children);
                var classnames = "file,foldercontainer,noitems".split(",");

                toggleelems.forEach(function (element) {
                    if (classnames.some(function (val) { return element.classList.contains(val); }))
                        element.style.display = isexpanded ? "none" : "block";
                });
            }
        }
    });
}