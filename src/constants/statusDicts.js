const testStatusDict = Object.freeze({
    STARTED: 'Started',
    SUCCESS: 'Success',
    ERROR: 'Error'
})

const taskStatus = Object.freeze({
    DEPOSIT: 'Creating the deposit',
    NOTREADY: 'Not started',
    SENDING: "Sending",
    READY: 'Ready',
    WAITING: 'Waiting',
    COMPUTING: 'Computing',
    FINISHED: 'Finished',
    TIMEOUT: 'Timeout',
    RESTART: 'Restart',
    FAILURE: 'Failure',
    ABORTED: "Aborted",
    CREATING: 'Creating',
    ERRORCREATING: 'Error creating'
})

module.exports = {
    testStatusDict,
    taskStatus
}