// --- Global State ---
let state = {
    user: null,
    currentView: 'login',
    activeTripId: null,
    trips: []
};

// Modal Edit State
let editState = {
    editingStopId: null,
    editingDayId: null,
    editingTripId: null
};

function getState() {
    return state;
}

function updateState(newState) {
    Object.assign(state, newState);
}

function setEditingContext(dayId, stopId, tripId) {
    editState.editingDayId = dayId;
    editState.editingStopId = stopId;
    editState.editingTripId = tripId || state.activeTripId;
}

export { state, editState, getState, updateState, setEditingContext };
