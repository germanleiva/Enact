// import Vue from 'vue';
// import Vuex from 'vuex';

// Vue.use(Vuex);

// export const store = new Vuex.Store({
//     state: {
//         visualStates: []
//         inputEvents: []
//     }
// });

import {extendArray} from './collections.js'
extendArray(Array);
import Vue from 'vue';
import io from 'socket.io-client';

let isLoggerActive = false;
let logger = function(text) {
    if (isLoggerActive) {
        console.log(text);
    }
}

export { VisualStateModel, MeasureModel, RuleModel, MeasureInput, TouchInput, logger }

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
            measureMode: false,
            linkingObject: undefined,
            currentColor: '#1a60f3'
        },
        cursorType: 'auto',
        context: undefined,
        rules: [],
        mobileWidth: 410, //iPhone 375 Nexus 5X 410
        mobileHeight: 660 //iPhone 667 Nexus 5X 660
    },
    computed: {
        socket() {
            //TODO check if putting this as a computed property is legit
            return io.connect('http://localhost:3000')
        }
    },
    methods: {
        deselectAllShapes() {
            for (let eachVisualState of this.visualStates) {
                eachVisualState.deselectShapes()
            }
        }
    },
    // watch: {
    //     visualStates: function(newValue,oldValue) {

    //     }
    // }
})

class MeasureModel {
    constructor(visualState,from, to, cachedFinalPosition) {
        this.visualState = visualState
        this.from = from // {type, id, handler}
        this.to = to?to:{type:undefined, id:undefined, handler:undefined}
        this.cachedInitialPosition = undefined
        this.cachedFinalPosition = cachedFinalPosition
        this.highlight = false
        this._relevantPoints = [new RelevantPoint(this,'center',0.5,0.5)];
    }
    get type() {
        if (this.from.type == this.to.type && this.from.id == this.to.id && this.from.handler == this.to.handler) {
            return "point"
        }
        return "distance"
    }
    get relevantPoints() {
        if (this.type == "distance") {
            return this._relevantPoints
        }
        return []
    }
    get id() {
        let p3=this.to.id, p4=this.to.handler

        if (!p3) {
            p3 = ""
        }

        if (!p4) {
            p4 = ""
        }

        return this.from.id+"-"+this.from.handler+"-"+p3+"-"+p4
    }
    get fromObject() {
        let fromId = this.from.id;
        switch (this.from.type) {
            case 'shape':
                return this.visualState.shapeFor(fromId)
            case 'distance':
                return this.visualState.distanceFor(fromId)
            default:
                console.log("Unrecognized 'from' type in MeasureModel: " + this.from.type)
        }
    }
    get toObject() {
        let toId = this.to.id;
        switch (this.to.type) {
            case 'shape':
                return this.visualState.shapeFor(toId)
            case 'distance':
                return this.visualState.distanceFor(toId)
            default:
                console.log("Unrecognized 'to' type in MeasureModel: " + this.to.type)
        }
    }
    get initialPoint() {
        if (this.cachedInitialPosition) {
            return this.cachedInitialPosition
        }
        return this.fromObject.positionOfHandler(this.from.handler)
    }
    get finalPoint() {
        if (this.to.id) {
            return this.toObject.positionOfHandler(this.to.handler)
        }
        return this.cachedFinalPosition
    }
    get deltaX() {
        return this.finalPoint.x - this.initialPoint.x
    }
    get width() {
        return Math.abs(this.finalPoint.x - this.initialPoint.x)
    }
    get deltaY() {
        return this.finalPoint.y - this.initialPoint.y
    }
    get height() {
        return Math.abs(this.finalPoint.y - this.initialPoint.y)
    }
    diffArray(nextMeasureWithTheSameModel) {
        let changes = []

        switch (this.type) {
            case "point": //I'm interested in translation
                if (this.initialPoint.x != this.finalPoint.x || this.initialPoint.y != this.finalPoint.y) {
                    console.log("WEIRD @ Point >> diffArray - the initialPoint and the finalPoint are not the same in a 'point measure'?")
                }
                if (nextMeasureWithTheSameModel.initialPoint.x != nextMeasureWithTheSameModel.finalPoint.x || nextMeasureWithTheSameModel.initialPoint.y != nextMeasureWithTheSameModel.finalPoint.y) {
                    console.log("WEIRD @ Point >> diffArray - the initialPoint and the finalPoint are not the same in a 'point measure' for my nextMeasureWithTheSameModel?")
                }
                let myOnlyPoint = this.initialPoint
                let hisOnlyPoint = nextMeasureWithTheSameModel.initialPoint

                if (myOnlyPoint.x == hisOnlyPoint.x && myOnlyPoint.y == hisOnlyPoint.y ) {
                    //No diff in starting point
                } else {
                    changes.push({id:this.id, type: 'measure', property: { name: "translation" , before: myOnlyPoint, after: hisOnlyPoint } })
                }

                break;
            case "distance": //I'm interested in scaling
                if (this.width != nextMeasureWithTheSameModel.width || this.height != nextMeasureWithTheSameModel.height) {
                    changes.push({id:this.id, type: 'measure', property: { name: "scaling", before: {w: this.width,h:this.height}, after: {w: nextMeasureWithTheSameModel.width, h: nextMeasureWithTheSameModel.height } } })
                }
                break;
        }

        return changes
    }
    positionOfHandler(handlerName) {
        if (handlerName == 'center'){
            return {x: this.initialPoint.x + (this.deltaX / 2), y: this.initialPoint.y + (this.deltaY / 2)}
        }
        console.log("WERIDDDDDDDDDD")
        abort()
    }
    deleteYourself() {
        let index = this.visualState.measures.indexOf(this)
        if (index >= 0) {
            this.visualState.measures.splice(index,1)
        }
        this.visualState = undefined
    }
}

class VisualStateModel {
    constructor() {
        this.shapesDictionary = {}
        this.measures = []
        this.currentInputEvent = undefined
        this.nextState = undefined
        this.previousState = undefined
        this.maxWidth = globalStore.mobileWidth
        this.maxHeight = globalStore.mobileHeight
        this.showAllInputEvents = false
    }
    get currentInputEventIndex() {
        return globalStore.inputEvents.indexOf(this.currentInputEvent)
    }
    get percentageInTimeline() {
        if (this.currentInputEventIndex >= 0) {
            let totalEventCount = globalStore.inputEvents.length
            return this.currentInputEventIndex * 100 / totalEventCount;
        } else {
            // return globalStore.visualStates.indexOf(this) * 100 / (globalStore.visualStates.length - 1);
            return globalStore.visualStates.indexOf(this) * 100 / globalStore.visualStates.length;

        }
    }
    importMeasuresFrom(previousState) {
        for (let previousMeasure of previousState.measures) {
            this.importMeasureUntilLastVisualState(previousMeasure)
        }
    }
    importMeasureUntilLastVisualState(previousMeasure){
        switch (previousMeasure.from.type) {
            case "shape":
                for (let shapeKey in this.shapesDictionary) {
                    if (previousMeasure.from.id == shapeKey) {
                        //This VisualState has the starting Shape so we import the measure
                        return this.addNewMeasureUntilLastState(previousMeasure.from.type,previousMeasure.from.id,previousMeasure.from.handler,previousMeasure.to.type,previousMeasure.to.id,previousMeasure.to.handler,previousMeasure.cachedFinalPosition)
                    }
                }
                break;
            case "distance":
                for (let aMeasure of this.measures) {
                    if (previousMeasure.from.id == aMeasure.id) {
                        //This VisualState has the starting Shape so we import the measure
                        return this.addNewMeasureUntilLastState(previousMeasure.from.type,previousMeasure.from.id,previousMeasure.from.handler,previousMeasure.to.type,previousMeasure.to.id,previousMeasure.to.handler,previousMeasure.cachedFinalPosition)
                    }
                }
                break;
        }


        return []
    }

    addNewMeasureUntilLastState(fromEntityType,fromId,fromHandlerName,toEntityType,toId,toHandlerName, cachedFinalPosition) {
        let result = []
        //TODO check if it is ok to create the 'to' object when the toId and toHandler are undefined
        let newMeasure = new MeasureModel(this, {type:fromEntityType,id:fromId,handler:fromHandlerName},{type:toEntityType,id:toId,handler:toHandlerName},cachedFinalPosition)

        result.push(newMeasure)
        this.measures.push(newMeasure)
        if (this.nextState) {
            let importedMeasures = this.nextState.importMeasureUntilLastVisualState(newMeasure)
            for (let anImportedMeasure of importedMeasures) {
                result.push(anImportedMeasure)
            }
        }
        return result
    }
    addNewShape(protoShape) {
        let correspondingVersion

        if (protoShape) {
            //Cheap way of cloning the version
            correspondingVersion = new ShapeModel(protoShape.id, protoShape);
        } else {
            let newShapeCount = globalStore.shapeCounter++;
            correspondingVersion = new ShapeModel('shape'+newShapeCount, undefined, 'white', 0, 0, 0, 0);
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
    distanceFor(aMeasureKey) {
        return this.measures.find(x => x.id == aMeasureKey)
    }
    measureFor(measureToCompare) {
        return this.measures.find(aMeasure => aMeasure.id === measureToCompare.id)
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

        let involvedMeasures = this.measures.filter(aMeasure => aMeasure.from.id == aShapeModel.id || aMeasure.to.id == aShapeModel.id)

        for (let anInvolvedMeasure of involvedMeasures) {
            console.log("We deleted the measure "+anInvolvedMeasure.id)
            anInvolvedMeasure.deleteYourself()
        }

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

        aShapeModel.prepareForDeletion()

        Vue.delete(this.shapesDictionary,aShapeModel.id)
        // this.shapesDictionary[aShapeModel.id] = undefined


        if (globalStore.visualStates[0] === this) {
            globalStore.socket.emit('message-from-desktop', { type: "DELETE_SHAPE", message: { id: aShapeModel.id } })
        }
    }
    toggleHighlightForInvolvedElement(shapeOrMeasureId,aBoolean) {
        function togglingHelper(aVisualState) {
            let involvedShape = aVisualState.shapesDictionary[shapeOrMeasureId]
            if (involvedShape) {
                //We need to hightlighted and also the nextShape with the same id
                involvedShape.highlight = aBoolean
            } else {
                //Maybe the diff was talking about a measure
                let involvedMeasure = aVisualState.measures.find(aMeasure => aMeasure.id == shapeOrMeasureId)
                if (involvedMeasure) {
                    involvedMeasure.highlight = aBoolean
                }
            }
        }

        togglingHelper(this)
        togglingHelper(this.nextState)
    }
    deselectShapes(){
        for (let eachShapeKey in this.shapesDictionary) {
            let eachShape = this.shapesDictionary[eachShapeKey]
            eachShape.deselect()
        }
    }
}

class RelevantPoint {
    constructor(shapeOrMeasure,namePrefix, percentualX, percentualY) {
        this.shapeOrMeasure = shapeOrMeasure
        this.namePrefix = namePrefix;
        this.percentualX = percentualX;
        this.percentualY = percentualY;
        this.isHandler = [0,1].includes(percentualX) && [0,1].includes(percentualY)
        this.leftMargin = -6
        this.topMargin = -6
    }
    get left() {
        return this.shapeOrMeasure.width * this.percentualX + this.leftMargin
    }
    get top() {
        return this.shapeOrMeasure.height * this.percentualY + this.topMargin
    }
}

class ShapeModel {
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
        this.highlight = false
        this.isSelected = false

        this.relevantPoints = [new RelevantPoint(this,'northWest',0,0), new RelevantPoint(this,'northEast',1,0), new RelevantPoint(this,'southEast',1,1), new RelevantPoint(this,'southWest',0,1), new RelevantPoint(this,'middleRight',1,0.5), new RelevantPoint(this,'middleLeft',0,0.5), new RelevantPoint(this,'middleTop',0.5,0), new RelevantPoint(this,'middleBottom',0.5,1), new RelevantPoint(this,'center',0.5,0.5)];
    }

    prepareForDeletion() {
        for (let point of this.relevantPoints) {
            point.shape = undefined
        }
    }

    get handlers() {
        return this.relevantPoints.filter(eachPoint => eachPoint.isHandler)
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
        // "check all properties"
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
        if (!nextShapeWithTheSameModel.isFollowingMaster('backgroundColor') && !this.areEqualValues('backgroundColor',this.backgroundColor.value,nextShapeWithTheSameModel.backgroundColor.value)) {
            // changes.push('Changed color from ' + this.color + ' to ' + nextShapeWithTheSameModel.color)
            changes.push({id:this.id, type: 'output', property: {name: "backgroundColor", before: this.color, after: nextShapeWithTheSameModel.color } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('translation') && !this.areEqualValues('translation',this.translation.value,nextShapeWithTheSameModel.translation.value)) {
            // changes.push('Changed position from ' + JSON.stringify(this.position) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.position))
            changes.push({id:this.id, type: 'output', property: { name: "translation", before: this.position, after: nextShapeWithTheSameModel.position } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('scaling') && !this.areEqualValues('scaling',this.scaling.value,nextShapeWithTheSameModel.scaling.value)) {
            // changes.push('Changed size from ' + JSON.stringify(this.scale) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.scale))
            changes.push({id:this.id, type: 'output', property: { name: "scaling", before: this.scale, after: nextShapeWithTheSameModel.scale } })
        }
        return changes
    }
    positionOfHandler(handlerName) {
        switch (handlerName) {
            case 'northEast':
                return {x: this.left + this.width, y: this.top }
            case 'northWest':
                return {x: this.left, y: this.top }
            case 'southWest':
                return {x: this.left, y: this.top + this.height}
            case 'southEast':
                return {x: this.left + this.width, y: this.top + this.height}
            case 'middleRight':
                return {x: this.left + this.width, y: this.top + this.height / 2}
            case 'middleLeft':
                return {x: this.left, y: this.top + this.height / 2}
            case 'middleTop':
                return {x: this.left + this.width / 2, y: this.top}
            case 'middleBottom':
                return {x: this.left + this.width / 2, y: this.top + this.height}
            case 'center':
                return {x: this.left + this.width / 2, y: this.top + this.height / 2}
        }
        console.log("WERIDDDDDDDDDD")
    }
    deselect() {
        this.isSelected = false
    }
}

class RuleModel {
    constructor(id,input, inputMin, inputMax, output, outputMin, outputMax) {
        this.id = id;
        this.input = input;
        this.output = output;
        this.outputMin = outputMin;
        this.outputMax = outputMax;
        this.outputMinValue = null;
        this.outputMaxValue = null;
        this.inputMin = inputMin;
        this.inputMax = inputMax;
        this.inputMinValue = null;
        this.inputMaxValue = null;
        this.enforce = true;
        this.currentOutput = undefined;
    }
    activate(anEvent, globalShapeDictionary) {
        if (this.input.shouldActivate(this, anEvent)) {
            //Does it affect one of the current shapes?
            let controlledShape = globalShapeDictionary[this.output.id]
            if (controlledShape) {
                // if (this.input.condition(event, controlledShape)) {
                    this.currentEvent = anEvent
                    this.currentOutput = controlledShape
                    return true
                // }
            }
        }
        return false
    }
    applyNewInput(newEvent, globalShapeDictionary) {
        // let touch = event.touches[0]
        this.input.applyNewInput(this,newEvent, globalShapeDictionary)
        this.currentEvent = newEvent

    }
    shouldKeepApplying(oldOutputValue,newOutputValue, globalShapeDictionary) {
        let isBiggerThan = true, isSmallerThan = true
        if (this.outputMin) {
            if (this.outputMinValue == null) {
                this.outputMinValue = globalShapeDictionary[this.outputMin.shapeId][this.outputMin.property]
            }
            isBiggerThan = newOutputValue >= this.outputMinValue
        }
        if (this.outputMax) {
            if (this.outputMaxValue == null) {
                this.outputMaxValue = globalShapeDictionary[this.outputMax.shapeId][this.outputMax.property]
            }
            isSmallerThan = newOutputValue <= this.outputMaxValue
        }
        return isBiggerThan && isSmallerThan
    }
    actuallyApply(delta, newEvent,globalShapeDictionary) {
        if (!this.input.condition(newEvent,this.currentOutput,globalShapeDictionary)) {
            return
        }
        switch (this.output.property) {
            case 'center':
                for (let i = 0; i < this.output.axis.length; i++) {
                    let eachOutputAxis = this.output.axis[i];
                    let correspondingInputAxis = this.input.axis[i];
                    if (!correspondingInputAxis) {
                        console.log("the rule does not have an input axis defined for that output axis, but we assume that the first will be used")
                        correspondingInputAxis = this.input.axis[0];
                    }
                    let outputProperty = ''
                    switch (eachOutputAxis) {
                        case 'x':
                            outputProperty = 'centerX';
                            break
                        case 'y':
                            outputProperty = 'centerY';
                            break;
                    }
                    let newValue = this.currentOutput[outputProperty] + delta[correspondingInputAxis]
                    if (this.shouldKeepApplying(this.currentOutput[outputProperty], newValue, globalShapeDictionary)) {
                        this.currentOutput[outputProperty] = newValue
                    }
                }
                break;
            case 'translation':
                for (let i = 0; i < this.output.axis.length; i++) {
                    let eachOutputAxis = this.output.axis[i];
                    let correspondingInputAxis = this.input.axis[i];
                    if (!correspondingInputAxis) {
                        console.log("the rule does not have an input axis defined for that output axis, but we assume that the first will be used")
                        correspondingInputAxis = this.input.axis[0];
                    }
                    let outputProperty = ''
                    switch (eachOutputAxis) {
                        case 'x':
                            outputProperty = 'left';
                            break
                        case 'y':
                            outputProperty = 'top';
                            break;
                    }
                    let newValue = this.currentOutput[outputProperty] + delta[correspondingInputAxis]
                    if (this.shouldKeepApplying(this.currentOutput[outputProperty], newValue, globalShapeDictionary)) {
                        this.currentOutput[outputProperty] = newValue
                    }
                }
                break;
            case 'scaling':
                for (let i = 0; i < this.output.axis.length; i++) {
                    let eachOutputAxis = this.output.axis[i];
                    let correspondingInputAxis = this.input.axis[i];
                    if (!correspondingInputAxis) {
                        console.log("the rule does not have an input axis defined for that output axis, but we assume that the first will be used")
                        correspondingInputAxis = this.input.axis[0];
                    }
                    let outputProperty = ''
                    let complementaryProperty = undefined
                    switch (eachOutputAxis) {
                        case 'x':
                            outputProperty = 'width';
                            complementaryProperty = 'left'
                            break
                        case 'y':
                            outputProperty = 'height';
                            complementaryProperty = 'top'
                                    //             target.height = newValue
        //             target.top -= (newValue - previousValue) / 2
                            break;
                    }

                    let newValue = this.currentOutput[outputProperty] + delta[correspondingInputAxis]
                    if (this.shouldKeepApplying(this.currentOutput[outputProperty], newValue, globalShapeDictionary)) {
                        this.currentOutput[outputProperty] = newValue
                        if (complementaryProperty) {
                            this.currentOutput[complementaryProperty] = this.currentOutput[complementaryProperty] + delta[correspondingInputAxis] / 2
                        }
                    }
                }
                break;
            }
    }
    reset() {
        this.outputMinValue = null
        this.outputMinValue = null
    }
}

class TouchInput {
    constructor(touchId, property, listOfAxis, aShouldApplyFn) {
        this.touchId = touchId
        this.property = property
        this.axis = listOfAxis
        this.condition = function(event, aShape) { return aShouldApplyFn(this.touchFor(event),aShape); }
    }
    shouldActivate(aRule, anEvent) {
        //The event has the corresponding touch
        return anEvent.touches[this.touchId] != undefined
    }
    touchFor(event) {
        return event.touches[this.touchId]
    }
    applyNewInput(aRule, newEvent, globalShapeDictionary) {
        let previousTouch = aRule.currentEvent.touches[this.touchId]

        let touch = newEvent.touches[this.touchId]

        if (!touch) {
            console.log("TouchInput >> applyNewInput: there isn't a touch = "+touch)
        }
        if (this.axis.length > aRule.output.axis.length) {
            console.log("Fatal error: there are more input axis than output axis on this rule: " + aRule)
            abort()
        }

        let delta = { x: 0, y: 0 }
        if (this.property == 'translation') {
            for (let eachInputAxis of this.axis) {
                delta[eachInputAxis] = touch['page' + eachInputAxis.toUpperCase()] - previousTouch['page' + eachInputAxis.toUpperCase()]
            }
        }

        aRule.actuallyApply(delta, newEvent, globalShapeDictionary)
    }
}

class MeasureInput {
    constructor(measureFunction,listOfAxis) {
        this.axis = listOfAxis
        this.measureFunction = measureFunction
    }
    shouldActivate(aRule, anEvent) {
        //For now, the measure rules should be always active (maybe if the related shaped are not present this should be false)
        return true;
    }
    condition(event,aShape) {
        return true;
    }
    applyNewInput(aRule,newEvent, globalShapeDictionary) {
        let result = this.measureFunction(newEvent)
        let previousValue = result.previousValue
        let newValue = result.newValue

        if (this.axis.length > aRule.output.axis.length) {
            console.log("Fatal error: there are more input axis than output axis on this rule: " + aRule)
            abort()
        }

        let delta = { x: 0, y: 0 }
        for (let eachInputAxis of this.axis) {
            delta[eachInputAxis] = newValue[eachInputAxis] - previousValue[eachInputAxis]
        }

        // if (aRule.shouldKeepApplying(previousValue, newValue)) {
        //     switch(this.propertyToChange) {
        //         case 'height':
        //             target.height = newValue
        //             target.top -= (newValue - previousValue) / 2

        //             break;
        //         case 'width':
        //             target.width = newValue
        //             target.left -= (newValue - previousValue) / 2

        //             break;
        //         case 'center':
        //             target.center = newValue

        //             break;
        //     }
        // }
        aRule.actuallyApply(delta, newEvent, globalShapeDictionary)
    }
}