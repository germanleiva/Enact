// import Vue from 'vue';
// import Vuex from 'vuex';

// Vue.use(Vuex);

// export const store = new Vuex.Store({
//     state: {
//         visualStates: []
//         inputEvents: []
//     }
// });

import Vue from 'vue';
import io from 'socket.io-client';

let isLoggerActive = false;
let logger = function(text) {
    if (isLoggerActive) {
        console.log(text);
    }
}

export const globalBus = new Vue();

export const globalStore = new Vue({
    data: {
        visualStates: [],
        inputEvents: [],
        isRecording: false,
        shapeCounter: 0,
        toolbarState: {
            drawMode: false,
            selectionMode: true,
            multiSelectionMode: false,
            currentColor: '#1a60f3'
        },
        cursorType: 'auto',
        context: undefined
    },
    computed: {
        socket() {
            //TODO check if putting this as a computed property is legit
            return io.connect('http://localhost:3000')
        }
    }
})

class VisualStateModel {
    constructor() {
        this.shapesDictionary = {}
        this.currentInputEvent = undefined
        this.nextState = undefined
        this.previousState = undefined
        this.maxWidth = 375
        this.maxHeight = 667
        this.showAllInputEvents = false
    }
    addNewShape(protoShape) {
        let correspondingVersion

        if (protoShape) {
            //Cheap way of cloning the version
            correspondingVersion = new ShapeModelVersion(protoShape.id, protoShape);
        } else {
            let newShapeCount = globalStore.shapeCounter++;
            correspondingVersion = new ShapeModelVersion('shape'+newShapeCount, undefined, 'white', 0, 0, 0, 0);
        }

        // if (oldShapeVM) {
        //     newShapeVM.isSelected = oldShapeVM.isSelected
        // }
        // var newShapeVM = new ShapeVM({ data: { visualState: this, version: correspondingVersion } });

        // newShapeVM.$mount();
        // this.canvasElement().appendChild(newShapeVM.$el);
        // Vue.set(this.shapesDictionary, newShapeVM.id, newShapeVM);
        Vue.set(this.shapesDictionary, correspondingVersion.id, correspondingVersion);

        return correspondingVersion;
    }
    didCreateShape(newlyCreatedShape, previousState) {
        if (this.previousState !== previousState) {
            console.log("WARNING: THIS SHOULDN'T HAPPEN");
        }

        let ourNewlyCreatedShape = this.addNewShape(newlyCreatedShape);
        if (this.nextState) {
            this.nextState.didCreateShape(ourNewlyCreatedShape, this);
        }
    }
    shapeFor(aShapeKey) {
        return this.shapesDictionary[aShapeKey];
    }
    somethingChangedPreviousState(shapeId, previousValue, changedValue, changedPropertyName) {
        let relatedShape = this.shapesDictionary[shapeId]
        if (!relatedShape) {
            return;
        }
        let newPreviousValue = previousValue;

        if (!relatedShape.isFollowingMaster(changedPropertyName)) {
            newPreviousValue = relatedShape.valueForProperty(changedPropertyName);
        }

        if (relatedShape.areEqualValues(changedPropertyName, newPreviousValue, previousValue)) {
            //Equal values, this shape should keep or start following the master
            relatedShape.followMaster(changedPropertyName);

            if (this.nextState) {
                this.nextState.somethingChangedPreviousState(shapeId, newPreviousValue, changedValue, changedPropertyName);
            }
        } else {
            logger("newPreviousValue is NOT equal to previousValue")

            //Shape is getting it s own value, so its not following the materVersion anymore
            if (relatedShape.isFollowingMaster(changedPropertyName)) {
                relatedShape[changedPropertyName].value = changedValue
            }
        }
    }
    deleteShape(aShapeModel) {
        aShapeModel.unfollowMaster()

        if (this.nextState) {
            let connectedShape = this.nextState.shapeFor(aShapeModel.id)
            if (connectedShape) {
                if (connectedShape.isFollowingMaster()) {
                    this.nextState.deleteShape(connectedShape)
                } else {
                    connectedShape.unfollowMaster()
                }
            }
        }

        Vue.delete(this.shapesDictionary,aShapeModel.id)
        // this.shapesDictionary[aShapeModel.id] = undefined

        if (globalStore.visualStates[0] === this) {
            globalStore.socket.emit('message-from-desktop', { type: "DELETE_SHAPE", message: { id: aShapeModel.id } })
        }
    }
}

class ShapeModelVersion {
    constructor(id, aMasterVersion, aColor = '', left = null, top = null, width = null, height = null) {
        this.id = id;

        this.opacity = 1

        this.backgroundColor = {
            value: aColor
        };
        this.translation = {
            value: {
                x: left,
                y: top
            }
        };
        this.scaling = {
            value: {
                w: width,
                h: height
            }
        };
        this.masterVersion = aMasterVersion;
    }
    cssText(opacityValue = 1) {
        return 'background-color:' + this.color + ";" +
            'position:' + 'absolute'  + ";" +
            'left:' + this.left + 'px'  + ";" +
            'top:' + this.top + 'px'  + ";" +
            'width:' + this.width + 'px'  + ";" +
            'height:' + this.height + 'px' + ";" +
            'border:' + ('1px') + ' solid gray' + ";" +
            'overflow:' + 'visible' + ";" +
            'opacity:' + opacityValue
    }
    get left() {
        if (this.translation.value.x == null) {
            return this.masterVersion.left;
        }
        return this.translation.value.x;
    }
    get top() {
        if (this.translation.value.y == null) {
            return this.masterVersion.top;
        }
        return this.translation.value.y;
    }
    get width() {
        if (this.scaling.value.w == null) {
            return this.masterVersion.width;
        }
        return this.scaling.value.w;
    }
    get height() {
        if (this.scaling.value.h == null) {
            return this.masterVersion.height;
        }
        return this.scaling.value.h;
    }
    get color() {
        if (this.backgroundColor.value == '') {
            return this.masterVersion.color;
        }
        return this.backgroundColor.value;
    }
    set top(value) {
        this.translation.value.y = value;
    }
    set left(value) {
        this.translation.value.x = value;
    }
    set width(value) {
        this.scaling.value.w = value;
    }
    set height(value) {
        this.scaling.value.h = value;
    }
    set color(value) {
        this.backgroundColor.value = value;
    }
    get position() {
        if (this.isFollowingMaster('translation')) {
            return this.masterVersion.position;
        }
        return this.translation.value;
    }
    get scale() {
        if (this.isFollowingMaster('scaling')) {
            return this.masterVersion.scale;
        }
        return this.scaling.value;
    }
    followMaster(property) {
        switch (property) {
            case 'backgroundColor':
                this.backgroundColor.value = '';
                break;
            case 'translation':
                this.translation.value.x = null;
                this.translation.value.y = null;
                break;
            case 'scaling':
                this.scaling.value.w = null;
                this.scaling.value.h = null;
                break;
        }
    }
    setOwnPropertiesFromMaster(property) {
        switch (property) {
            case 'backgroundColor':
                this.color = this.color
                break;
            case 'translation':
                this.left = this.left
                this.top = this.top
                break;
            case 'scaling':
                this.width = this.width
                this.height = this.height
                break;
            case '':
            default:
                this.setOwnPropertiesFromMaster('backgroundColor')
                this.setOwnPropertiesFromMaster('translation')
                this.setOwnPropertiesFromMaster('scaling')
                break;
        }
    }
    unfollowMaster(property) {
        this.setOwnPropertiesFromMaster(property)
        this.masterVersion = undefined
    }
    isFollowingMaster(property) {
        switch (property) {
            case 'backgroundColor':
                return this.backgroundColor.value == '';
            case 'translation':
                return this.translation.value.x == null && this.translation.value.y == null;
            case 'scaling':
                return this.scaling.value.w == null && this.scaling.value.h == null;
        }
        console.log("check all properties")
        return this.isFollowingMaster('backgroundColor') && this.isFollowingMaster('translation') && this.isFollowingMaster('scaling')
    }
    nonZeroValue(property) {
        switch (property) {
            case 'backgroundColor':
                return this.color;
            case 'translation':
                return this.position;
            case 'scaling':
                return this.scale;
        }
    }
    valueForProperty(property) {
        return this[property].value;
    }
    areEqualValues(property, value1, value2) {
        switch (property) {
            case 'backgroundColor':
                return value1 == value2;
            case 'translation':
                return value1.x == value2.x && value1.y == value2.y;
            case 'scaling':
                return value1.w == value2.w && value1.h == value2.h;
        }
    }
    isPointInside(x, y) {
        return this.top < y && this.left < x && x < this.left + this.width && y < this.top + this.height;
    }
    diffArray(nextShapeWithTheSameModel) {
        let changes = []
        if (!nextShapeWithTheSameModel.isFollowingMaster('backgroundColor')) {
            // changes.push('Changed color from ' + this.color + ' to ' + nextShapeWithTheSameModel.color)
            changes.push({ backgroundColor: { previousValue: this.color, newValue: nextShapeWithTheSameModel.color } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('translation')) {
            // changes.push('Changed position from ' + JSON.stringify(this.position) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.position))
            changes.push({ translation: { previousValue: this.position, newValue: nextShapeWithTheSameModel.position } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('scaling')) {
            // changes.push('Changed size from ' + JSON.stringify(this.scale) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.scale))
            changes.push({ scaling: { previousValue: this.scale, newValue: nextShapeWithTheSameModel.scale } })
        }
        return changes
    }
}

export { VisualStateModel }
export { logger }