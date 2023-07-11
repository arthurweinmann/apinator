function GlobalInit() {
    boxedMonaco.editor.create(document.querySelector('.code'), {
        value: `console.log("Hello, World")`,
        language: 'javascript',
        scrollbar: {
            vertical: 'auto',
            horizontal: 'auto'
        },
        theme: "vs-dark",
        automaticLayout: true,
    });

    setupFilesystem();

    // if (localStorage.getItem("X-APINATOR-AUTH") == "") {
    //     document.querySelector(".signinpopup").style.display = "block";
    //     logininit();
    // } else {

    // }
}

function logininit() {
    var button = document.getElementById("signinButton");
    var input = document.getElementById("signinValue");

    button.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var value = input.value;
        localStorage.setItem("X-APINATOR-AUTH", value);

        document.querySelector(".signinpopup").style.display = "none";
    });
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