import { dict } from './../../actions'
const {remote} = window.electron;
const { getDefaultLocation } = remote.require('./index')
const {setConfig, getConfig, dictConfig} = remote.getGlobal('configStorage')

const {SET_FILE_LOCATION} = dict
const {DEFAULT_FILE_LOCATION} = dictConfig
const initialState = {
    location: getConfig(DEFAULT_FILE_LOCATION) || getDefaultLocation()
}
const setFileLocation = (state = initialState, action) => {
    switch (action.type) {

    case SET_FILE_LOCATION:
        setConfig(DEFAULT_FILE_LOCATION, action.payload)
        return Object.assign({}, state, {
            location: action.payload
        });


    default:
        return state;
    }
}

export default setFileLocation