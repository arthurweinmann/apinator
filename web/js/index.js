function GlobalInit() {
    if (localStorage.getItem("X-APINATOR-AUTH") === null) {
        document.querySelector(".signinpopup").style.display = "block";
        logininit();
    } else {
        start();
    }
}

function start() {
    addFile("/cmd/apinator/main.go", "javascript");
    addFile("cmd/build/main.go", "javascript");
    addFile("internal/config/config.go", "javascript");

    writeQuestion("What would you like to work on today?", 
    createTextareaWithPlaceholder("Your specification goes here"),
    createButtonWithText("Send"));
}

function writeQuestion(question, ...actioncontent) {
    document.querySelector(".question").innerHTML = question;
    document.querySelector(".question-action").innerHTML = "";
    document.querySelector(".question-action").appendChild(...actioncontent);
}

function createTextareaWithPlaceholder(placeholderText) {
    var textarea = document.createElement("textarea");
    textarea.placeholder = placeholderText;
    return textarea;
}

function createButtonWithText(buttonText) {
    var button = document.createElement("button");
    button.innerHTML = buttonText;
    return button;
}

function logininit() {
    var button = document.getElementById("signinButton");
    var input = document.getElementById("signinValue");

    document.body.style.overflow = "hidden"

    button.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var value = input.value;
        localStorage.setItem("X-APINATOR-AUTH", value);

        document.querySelector(".signinpopup").style.display = "none";
        document.body.style.overflow = "visible";
        start();
    });

    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();

            var value = input.value;
            localStorage.setItem("X-APINATOR-AUTH", value);

            document.querySelector(".signinpopup").style.display = "none";
            document.body.style.overflow = "visible";
            start();
        }
    });
}

var editorInit = false;

function addFile(path, language, content) {
    if (!editorInit) {
        setupFilesystem();

        window.boxedMonaco.editor.create(document.querySelector('.code'), {
            value: `console.log("Hello, World")`,
            language: language,
            scrollbar: {
                vertical: 'auto',
                horizontal: 'auto'
            },
            theme: "vs-dark",
            automaticLayout: true,
        });

        editorInit = true;
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
    root.appendChild(fileSpan);
}

function setupFilesystem() {
    var hierarchy = document.getElementById("hierarchy");
    hierarchy.addEventListener("click", function (event) {
        var elem = event.target;
        if (elem.tagName.toLowerCase() == "span" && elem !== event.currentTarget) {
            var type = elem.classList.contains("folder") ? "folder" : "file";
            if (type == "file") {
                alert("File accessed");
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