let fileHandle;

/*async function getNewFileHandle() {
    const options = {
        types: [
            {
                description: "Text Files",
                accept: {
                    "text/plain": [".txt"]
                }
            }
        ]
    };
    const handle = await window.showSaveFilePicker(options);
    return handle;
}*/

async function writeFile(fileHandle, contents) {
    const writable = await fileHandle.createWritable();
    for (var i = 0; i < contents.length; i++) {
        await writable.write(contents[i]);
    }
    await writable.close();
}

async function saveThing(to_save) {
    [fileHandle] = await window.showOpenFilePicker();
    writeFile(fileHandle, to_save);
    onSaveEnd();
}

async function saveState(to_save) {
    saveThing(to_save);
}

async function saveRAM(to_save) {
    saveThing(to_save);
}

async function saveROM(to_save) {
    saveThing(to_save);
}

async function saveText(to_save) {
    saveThing(to_save);
}
async function onSaveEnd() {

};

async function getFileHandle() {
    let handle;
    [handle] = await window.showOpenFilePicker();
    onFileHandleLoad(handle);
};
async function onFileHandleLoad(handle) {

};

let file;
async function getROM() {
    [fileHandle] = await window.showOpenFilePicker();
    let file = await fileHandle.getFile();
    onROMload(file);
};
async function onROMload(file) {

};
