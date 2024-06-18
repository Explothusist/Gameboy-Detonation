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
	fileWritten();
}
async function fileWritten() {
	
};

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



async function getDirectoryFileHandle() {
    let handle;
    handle = await window.showDirectoryPicker();
    await handle.requestPermission({ mode: "readwrite" });
    onDirectoryFileHandleLoad(handle);
};
async function onDirectoryFileHandleLoad(handle) {

};

async function getFileHandleFromDirectoryHandle(directoryHandle, directory, filename) {
    let SubDirectory = await directoryHandle.getDirectoryHandle(directory);
    let fileHandle = await SubDirectory.getFileHandle(filename);
    onFileFromDirLoad(fileHandle);
};
async function onFileFromDirLoad(fileHandle) {

};

async function* getFilesRecursively(entry) {
    if (entry.kind === "file") {
        const file = await entry.getFile();
        if (file !== null) {
            //file.relativePath = getRelativePath(entry);
            yield file;
        }
    } else if (entry.kind === "directory") {
        for await (const handle of entry.values()) {
            yield* getFilesRecursively(handle);
        }
    }
}
async function getAllFileHandle(directoryHandle) {
    let fileHandles = [];
    for await (const fileHandle of getFilesRecursively(directoryHandle)) {
        fileHandles.push(fileHandle);
    }
    onAllFileHandleLoad(fileHandles);
};
async function onAllFileHandleLoad(fileHandles) {

};

async function FileHandlesToFiles(fileHandles) {
    let files = [];
    for (let fileHandle of fileHandles) {
        files.push(await fileHandle.getFile());
    }
    onFileHandlesToFilesLoad(files);
};
async function onFileHandlesToFilesLoad(files) {

};

async function saveToFileInDirectory(directoryHandle, directory, filename, contents) {
    console.log("Finding directory...");
    let SubDirectory = await directoryHandle.getDirectoryHandle(directory);
    console.log("Finding file...");
    let fileHandle = await SubDirectory.getFileHandle(filename);
    console.log("Writing file...");
    await writeFile(fileHandle, contents);
    console.log("Write complete!");
    saveInDirectoryComplete();
};
async function createFileInDirectory(directoryHandle, directory, filename, contents) {
    let SubDirectory = await directoryHandle.getDirectoryHandle(directory);
    let fileHandle = await SubDirectory.getFileHandle(filename, { create: true });
    await writeFile(fileHandle, contents);
    saveInDirectoryComplete();
};
async function saveInDirectoryComplete() {

};