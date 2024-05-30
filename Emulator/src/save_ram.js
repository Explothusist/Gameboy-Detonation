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

async function saveState(to_save) {
    [fileHandle] = await window.showOpenFilePicker();
    writeFile(fileHandle, to_save);
}
