// import Vue from 'vue';
// import Vuex from 'vuex';

// Vue.use(Vuex);

// export const store = new Vuex.Store({
//     state: {
//         visualStates: []
//         inputEvents: []
//     }
// });

import { extendArray } from './collections.js'
extendArray(Array);
import Vue from 'vue';
import io from 'socket.io-client';
import _ from 'lodash';
import tinyColor from 'tinycolor2';

let isLoggerActive = false;
let logger = function(text) {
    if (isLoggerActive) {
        console.log(text);
    }
}

export { VisualStateModel, RectangleModel, PolygonModel, ShapeModel,  MeasureModel, RelevantPoint, InputEvent, InputEventTouch, RulePlaceholderModel, RuleSidePlaceholder, RuleModel, MeasureInput, TouchInput, ShapeInput, ShapeOutputRule, DiffModel, logger }

export const globalBus = new Vue();

export const globalStore = new Vue({
    data: {
        visualStates: [],
        inputEvents: [],
        isRecording: false,
        shapeCounter: 0,
        measureCounter: 0,
        ruleCounter: 0,
        toolbarState: {
            rectangleMode: false,
            polygonMode: false,
            selectionMode: true,
            multiSelectionMode: false,
            measureMode: false,
            shapeType: 'rectangle',
            linkingObject: undefined,
            currentColor: '#1a60f3',
        },
        cursorType: 'auto',
        context: undefined,
        rulesPlaceholders: [],
        mobileWidth: 410, //iPhone 375 Nexus 5X 410
        mobileHeight: 660 //iPhone 667 Nexus 5X 660
    },
    computed: {
        isDrawMode() {
            return this.toolbarState.rectangleMode || this.toolbarState.polygonMode
        },
        socket() {
            //TODO check if putting this as a computed property is legit
            let newSocket = io.connect('http://localhost:3000')
            newSocket.on('message-from-device', function(data) {
                globalBus.$emit('message-from-device-'+data.type,data)
            });
            return newSocket
        }
    },
    methods: {
        setSelectionMode() {
            this.toolbarState.rectangleMode = false;
            this.toolbarState.polygonMode = false;
            this.toolbarState.selectionMode = true;
            this.toolbarState.measureMode = false;
            this.cursorType = "default";
        },
        setRectangleMode() {
            this.toolbarState.rectangleMode = true;
            this.toolbarState.polygonMode = false;
            this.toolbarState.selectionMode = false;
            this.toolbarState.measureMode = false;
            this.cursorType = "crosshair";
        },
        setPolygonMode() {
            this.toolbarState.rectangleMode = false;
            this.toolbarState.polygonMode = true;
            this.toolbarState.selectionMode = false;
            this.toolbarState.measureMode = false;
            this.cursorType = "crosshair";
        },
        setMeasureMode() {
            this.toolbarState.rectangleMode = false;
            this.toolbarState.polygonMode = false;
            this.toolbarState.selectionMode = false;
            this.toolbarState.measureMode = true;
            this.cursorType = "crosshair";
        },
        deselectAllShapes() {
            for (let eachVisualState of this.visualStates) {
                eachVisualState.deselectShapes()
            }
        },
        insertVisualStateAfter(aShapeDictionary,previousVisualState) {
            var newVisualState = new VisualStateModel()

            for (let eachShapeKey in aShapeDictionary) {
                console.log("Iterating aShapeDicionary: " + eachShapeKey)
                let referenceShape = aShapeDictionary[eachShapeKey]

                let clonedShapeModel = newVisualState.addNewShape(referenceShape.type,eachShapeKey)

                // clonedShapeModel.color = referenceShape.color
                // clonedShapeModel.left = referenceShape.left
                // clonedShapeModel.top = referenceShape.top
                // clonedShapeModel.width = referenceShape.width
                // clonedShapeModel.height = referenceShape.height
                //Cheating to account for rectangles and polygons
                clonedShapeModel.fromJSON(referenceShape)
            }

            let previousVisualStateIndex = this.visualStates.indexOf(previousVisualState)
            let nextVisualState = previousVisualState.nextState

            // newVisualState.importMeasuresFrom(previousVisualState);

            //TODO DRY LOOK DOWN
            for (let previousShapeId in previousVisualState.shapesDictionary) {
                let aPreviousShape = previousVisualState.shapesDictionary[previousShapeId]
                let aNewShape = newVisualState.shapesDictionary[previousShapeId]
                if (aNewShape) {
                    for (let eachProperty of ['color','position','size']) {
                        if (aPreviousShape.areEqualValues(eachProperty,aPreviousShape[eachProperty],aNewShape[eachProperty])) {
                            aNewShape.followMaster(eachProperty)
                        }
                    }
                    aNewShape.masterVersion = aPreviousShape
                }
            }

            previousVisualState.nextState = newVisualState
            newVisualState.previousState = previousVisualState

            if (nextVisualState) {
                //TODO DRY LOOK UP
                for (let nextShapeId in nextVisualState.shapesDictionary) {
                    let aNextShape = nextVisualState.shapesDictionary[nextShapeId]
                    let aNewShape = newVisualState.shapesDictionary[nextShapeId]

                    if (aNewShape) {
                        for (let eachProperty of ['color','position','size']) {
                            if (aNextShape.areEqualValues(eachProperty,aNextShape[eachProperty],aNewShape[eachProperty])) {
                                aNextShape.followMaster(eachProperty)
                            }
                        }
                        aNextShape.masterVersion = aNewShape
                    }
                }

                newVisualState.nextState = nextVisualState
                nextVisualState.previousVisualState = newVisualState
            }

            this.visualStates.insert(previousVisualStateIndex+1,newVisualState)

            //TODO DRY
            let correspondingIndex = Math.floor(newVisualState.percentageInTimeline / 100 * (globalStore.inputEvents.length -1))
            newVisualState.currentInputEvent = globalStore.inputEvents[correspondingIndex]
        },
        removeInputEvents() {
            for (let eachVS of globalStore.visualStates) {
                eachVS.currentInputEvent = undefined
            }
            this.inputEvents.removeAll()
        }
    },
    watch: {
        isRecording: function(newValue,oldValue) {
            console.log('isRecording watch')
            globalBus.$emit('didRecordingChanged',newValue)
        },
        'toolbarState.polygonMode': function(newValue,oldValue) {
            console.log("polygonMode changed!!" + newValue)
            if (newValue == false) {
                globalBus.$emit('polygonModeOff')
            }
        }
    }
})

class PropertyDiff {
    constructor(id,before,after) {
        this.id = id
        this.before = before
        this.after = after
    }
    toJSON() {
        return {before: this.before, after: this.after }
    }
}

class TranslationDiff extends PropertyDiff {
    get delta() {
        return {x: this.after.x - this.before.x , y: this.after.y - this.before.y }
    }
    applyDelta(visualState,shapeModel) {
        visualState.changeProperty(shapeModel,'position',shapeModel.position,{x:shapeModel.left+this.delta.x,y:shapeModel.top+this.delta.y})
    }
    get name() {
        return "position"
    }
}

class ScalingDiff extends PropertyDiff {
    get delta() {
        return {x: this.after.x - this.before.x , y: this.after.y - this.before.y }
    }
    applyDelta(visualState,shapeModel) {
        visualState.changeProperty(shapeModel,'size',shapeModel.size,{x:shapeModel.width+this.delta.x,y:shapeModel.height+this.delta.y})
    }
    get name() {
        return "size"
    }
}

class BackgroundColorDiff extends PropertyDiff {
    get delta() {
        let colorAfterRgb = tinyColor(this.after).toRgb()
        let colorBeforeRgb = tinyColor(this.before).toRgb()

        let deltaColor = {r: colorAfterRgb.r - colorBeforeRgb.r,g: colorAfterRgb.g - colorBeforeRgb.g, b: colorAfterRgb.b - colorBeforeRgb.b}

        return deltaColor
    }

    applyDelta(visualState,shapeModel) {
        let deltaColorRgb = this.delta

        let originalColorRgb = tinyColor(shapeModel.color).toRgb()

        let newColorRgb = {}
        //white #ffffff (255,255,255) is boring
        for (let colorComponent of "rgb") {
            newColorRgb[colorComponent] = (originalColorRgb[colorComponent] + deltaColorRgb[colorComponent]) //% 255
        }
        // console.log("delta: " + JSON.stringify(deltaColorRgb));
        // console.log("original: " + JSON.stringify(originalColorRgb));
        // console.log("new: " + JSON.stringify(newColorRgb));
        visualState.changeProperty(shapeModel,'color',shapeModel.color, tinyColor(newColorRgb).toHexString())
    }
    get name() {
        return "color"
    }
}

class VertexDiff extends PropertyDiff {
    get delta() {
        return {x: this.after.x - this.before.x , y: this.after.y - this.before.y }
    }
    applyDelta(visualState,shapeModel) {
        let currentVertex = shapeModel.vertexFor(this.id)
        visualState.changeProperty(shapeModel,this.id,currentVertex,{x:currentVertex.x+this.delta.x,y:currentVertex.y+this.delta.y})
    }
    get name() {
        return "position"
    }
    toJSON() {
        return {id:this.id,before:this.before,after:this.after}
    }
}

class AddedDiff extends PropertyDiff {

    get name() {
        return "added"
    }
}

class RemovedDiff extends PropertyDiff {

    get name() {
        return "removed"
    }
}

class DiffModel {
    constructor({visualStateIndex:visualStateIndex,id:id,name:name,type:type,property:property}) {
        this.visualStateIndex = visualStateIndex
        this.id = id
        this.name = name
        this.type = type //For example, output

        switch (property.name) {
            case "position": {
                this.property = new TranslationDiff(undefined,property.before,property.after)
                break;
            }
            case "size": {
                this.property = new ScalingDiff(undefined,property.before,property.after)
                break;
            }
            case "color": {
                this.property = new BackgroundColorDiff(undefined,property.before,property.after)
                break;
            }
            case "vertex": {
                this.property = new VertexDiff(property.before.id,property.before,property.after)
                break;
            }
            case "added": {
                this.property = new AddedDiff(undefined,property.before,property.after)
                break;
            }
            case "removed": {
                this.property = new RemovedDiff(undefined,property.before,property.after)
                break;
            }
            default: {
                console.log("Unrecognized name of property in DiffModel constructor: " + property.name)
            }
        }
    }
    toJSON() {
        return {visualStateIndex:this.visualStateIndex,id:this.id,name:this.name,type:this.type,property:this.property.toJSON()}
    }
    get delta() {
        return this.property.delta
    }
    applyDelta(visualState,shapeModel) {
        this.property.applyDelta(visualState,shapeModel)
    }
}

class MeasureModel {
    constructor(visualState, from, to, cachedFinalPosition) {
        this.visualState = visualState
        this.from = from // {type, id, handler}
        this.to = to ? to : { type: undefined, id: undefined, handler: undefined }
        this.cachedInitialPosition = undefined
        this.cachedFinalPosition = cachedFinalPosition
        this.highlight = false
        this._relevantPoints = [new RelevantPoint(this, 'center', 0.5, 0.5)];
        this.nameCount = -1
    }
    get name() {
        switch (this.type) {
            case "point":{
                return "P"+this.nameCount
            }
            case "distance":{
                return "D"+this.nameCount
            }
            default:{
                console.log("Unrecognized nameCount for measure: "+ this.id);
            }
        }
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
        let p3 = this.to.id,
            p4 = this.to.handler

        if (!p3) {
            p3 = ""
        }

        if (!p4) {
            p4 = ""
        }

        return this.from.id + "-" + this.from.handler + "-" + p3 + "-" + p4
    }
    get fromObject() {
        let fromId = this.from.id;
        switch (this.from.type) {
            case 'shape':{
                return this.visualState.shapeFor(fromId)
            }
            case 'distance':{
                return this.visualState.distanceFor(fromId)
            }
            case 'input':{
                if (this.visualState.currentInputEvent) {
                    return this.visualState.currentInputEvent.touchFor(fromId)
                }
                console.log("MeasureModel >> fromObject : this.visualState.currentInputEvent = undefined")
                return undefined
            }
            default:
                console.log("Unrecognized 'from' type in MeasureModel: " + this.from.type)
        }
    }
    get toObject() {
        let toId = this.to.id;
        switch (this.to.type) {
            case 'shape':{
                return this.visualState.shapeFor(toId)
            }
            case 'distance':{
                return this.visualState.distanceFor(toId)
            }
            case 'input':{
                if (this.visualState.currentInputEvent) {
                    return this.visualState.currentInputEvent.touchFor(toId)
                }
                console.log("MeasureModel >> fromObject : this.visualState.currentInputEvent = undefined")
                return undefined
            }
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
            case "point": {
                //I'm interested in translation
                if (this.initialPoint.x != this.finalPoint.x || this.initialPoint.y != this.finalPoint.y) {
                    console.log("WEIRD @ Point >> diffArray - the initialPoint and the finalPoint are not the same in a 'point measure'?")
                }
                if (nextMeasureWithTheSameModel.initialPoint.x != nextMeasureWithTheSameModel.finalPoint.x || nextMeasureWithTheSameModel.initialPoint.y != nextMeasureWithTheSameModel.finalPoint.y) {
                    console.log("WEIRD @ Point >> diffArray - the initialPoint and the finalPoint are not the same in a 'point measure' for my nextMeasureWithTheSameModel?")
                }
                let myOnlyPoint = this.initialPoint
                let hisOnlyPoint = nextMeasureWithTheSameModel.initialPoint

                if (myOnlyPoint.x == hisOnlyPoint.x && myOnlyPoint.y == hisOnlyPoint.y) {
                    //No diff in starting point
                } else {
                    changes.push({ id: this.id, name: this.name, type: 'measure', property: { name: "position", before: myOnlyPoint, after: hisOnlyPoint } })
                }

                break;
            }
            case "distance": {
                //I'm interested in scaling
                if (this.width != nextMeasureWithTheSameModel.width || this.height != nextMeasureWithTheSameModel.height) {
                    changes.push({ id: this.id, name: this.name, type: 'measure', property: { name: "size", before: { x: this.width, y: this.height }, after: { x: nextMeasureWithTheSameModel.width, y: nextMeasureWithTheSameModel.height } } })
                }
                break;
            }
        }

        return changes
    }
    positionOfHandler(handlerName) {
        if (handlerName == 'center') {
            if (this.fromObject) {
                return { x: this.initialPoint.x + (this.deltaX / 2), y: this.initialPoint.y + (this.deltaY / 2) }
            }
            return undefined
        }
        console.log("WERIDDDDDDDDDD")
        abort()
    }
    deleteYourself() {
        let index = this.visualState.measures.indexOf(this)
        if (index >= 0) {
            this.visualState.measures.splice(index, 1)
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
        this.timeoutForStopMovingSelectedShapes = undefined
    }
    get testShapes() {
        if (this.currentInputEvent) {
            return this.currentInputEvent.testShapes
        }
        return []
    }
    get testPassed() {
        for (let testShape of this.testShapes) {
            let myShape = this.shapesDictionary[testShape.id]

            if (myShape != undefined && myShape.testAgainst(testShape)) {

            } else {
                return false
            }
        }
        return true
    }
    changeProperty(shapeModel,propertyName,previousValue,newValue) {
        if (shapeModel.isFollowingMaster(propertyName) && shapeModel.areEqualValues(propertyName, previousValue, newValue)) {
            //Don't do anything, keep following master and do not propagate
        } else {
            shapeModel.changeOwnProperty(propertyName,newValue)
            if (this.nextState) {
                this.nextState.somethingChangedPreviousState(shapeModel.id, previousValue, newValue, propertyName);
            }
        }
    }
    addVertex(polygonId,startingCanvasMousePosition) {
        let newVertex = this.shapeFor(polygonId).addVertex(startingCanvasMousePosition)
        if (this.nextState) {
            this.nextState.addVertex(polygonId,startingCanvasMousePosition)
        }
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
    importMeasureUntilLastVisualState(previousMeasure) {
        switch (previousMeasure.from.type) {
            case "shape":{
                for (let shapeKey in this.shapesDictionary) {
                    if (previousMeasure.from.id == shapeKey) {
                        //This VisualState has the starting Shape so we import the measure
                        return this.addNewMeasureUntilLastState(previousMeasure.from.type, previousMeasure.from.id, previousMeasure.from.handler, previousMeasure.to.type, previousMeasure.to.id, previousMeasure.to.handler, previousMeasure.cachedFinalPosition)
                    }
                }
                break;
            }
            case "distance":{
                for (let aMeasure of this.measures) {
                    if (previousMeasure.from.id == aMeasure.id) {
                        //This VisualState has the starting measure so we import the measure
                        return this.addNewMeasureUntilLastState(previousMeasure.from.type, previousMeasure.from.id, previousMeasure.from.handler, previousMeasure.to.type, previousMeasure.to.id, previousMeasure.to.handler, previousMeasure.cachedFinalPosition)
                    }
                }
                break;
            }
            case "input":{
                // if (this.currentInputEvent) {
                    // if (this.currentInputEvent.touches.some(aTouch => aTouch.id == previousMeasure.from.id)) {
                        //This VisualState has the starting event so we import the measure
                        return this.addNewMeasureUntilLastState(previousMeasure.from.type, previousMeasure.from.id, previousMeasure.from.handler, previousMeasure.to.type, previousMeasure.to.id, previousMeasure.to.handler, previousMeasure.cachedFinalPosition)
                    // }
                // }
                break;
            }
        }


        return []
    }

    addNewMeasureUntilLastState(fromEntityType, fromId, fromHandlerName, toEntityType, toId, toHandlerName, cachedFinalPosition) {
        let result = []
            //TODO check if it is ok to create the 'to' object when the toId and toHandler are undefined
        let newMeasure = new MeasureModel(this, { type: fromEntityType, id: fromId, handler: fromHandlerName }, { type: toEntityType, id: toId, handler: toHandlerName }, cachedFinalPosition)
        newMeasure.nameCount = globalStore.measureCounter++;
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
    addNewShape(shapeType,shapeId,protoShape) {
        let correspondingVersion

        if (protoShape) {
            //Cheap way of cloning the version, and setting the masterVersion!
            correspondingVersion = ShapeModel.createShape(shapeType, shapeId, protoShape);
        } else {
            if (shapeId) {
                correspondingVersion = ShapeModel.createShape(shapeType,shapeId);
            } else {
                let newShapeCount = globalStore.shapeCounter++;
                correspondingVersion = ShapeModel.createShape(shapeType,'S' + newShapeCount);
            }
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

        let ourNewlyCreatedShape = this.addNewShape(newlyCreatedShape.type,newlyCreatedShape.id,newlyCreatedShape);
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
    measureFor(measureId) {
        return this.measures.find(aMeasure => aMeasure.id === measureId)
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
                relatedShape.changeOwnProperty(changedPropertyName,changedValue)
            }
        }
    }
    deleteShape(aShapeModel) {
        aShapeModel.unfollowMaster()

        let involvedMeasures = this.measures.filter(aMeasure => aMeasure.from.id == aShapeModel.id || aMeasure.to.id == aShapeModel.id)

        for (let anInvolvedMeasure of involvedMeasures) {
            console.log("We deleted the measure " + anInvolvedMeasure.id)
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

        Vue.delete(this.shapesDictionary, aShapeModel.id)
            // this.shapesDictionary[aShapeModel.id] = undefined


        if (globalStore.visualStates[0] === this) {
            globalStore.socket.emit('message-from-desktop', { type: "DELETE_SHAPE", message: { id: aShapeModel.id } })
        }
    }
    toggleHighlightForInvolvedElement(diffData, aBoolean) {
        //diffData.type == shape,measure(distance&point),touch
        function togglingHelper(aVisualState) {
            switch (diffData.type) {
                case 'shape': {
                    let involvedShape = aVisualState.shapesDictionary[diffData.id]
                    if (involvedShape) {
                        if (diffData.property.name == "vertex") {
                            let vertex = involvedShape.vertexFor(diffData.property.after.id)
                            vertex.highlight = aBoolean
                        } else {
                            involvedShape.highlight = aBoolean
                        }
                    }
                    break;
                }
                case 'measure': {
                    let involvedMeasure = aVisualState.measures.find(aMeasure => aMeasure.id == diffData.id)
                    if (involvedMeasure) {
                        involvedMeasure.highlight = aBoolean
                    }
                    break;
                }
                case 'touch': {
                    let involvedInputEvent = aVisualState.currentInputEvent

                    if (involvedInputEvent) {
                        for(let eachTouch of involvedInputEvent.touches) {
                            if (eachTouch.id == diffData.id) {
                                eachTouch.highlight = aBoolean
                            }
                        }
                    }
                    break;
                }
                default: {
                    console.log("Unrecognized diffData type: " + diffData.type)
                }
            }
        }

        togglingHelper(this)
        togglingHelper(this.nextState)
    }
    deselectShapes() {
        for (let eachShapeKey in this.shapesDictionary) {
            let eachShape = this.shapesDictionary[eachShapeKey]
            eachShape.deselect()
        }
    }
    selectedShapes() {
        let selected = []
        for (let eachShapeId in this.shapesDictionary) {
            let shape = this.shapesDictionary[eachShapeId]
            if (shape.isSelected) {
                selected.push(shape)
            }
        }
        return selected
    }
    moveSelectedShapes(deltaX,deltaY) {
        for (let eachSelectedShape of this.selectedShapes()) {
            eachSelectedShape.isMoving = true
            this.changeProperty(eachSelectedShape,'position',eachSelectedShape.position,{x:eachSelectedShape.left+deltaX,y:eachSelectedShape.top+deltaY})
        }

        if (this.timeoutForStopMovingSelectedShapes) {
            clearTimeout(this.timeoutForStopMovingSelectedShapes)
        }
        this.timeoutForStopMovingSelectedShapes = setTimeout(this.stopMovingSelectedShapes.bind(this),300)
    }
    stopMovingSelectedShapes() {
        this.selectedShapes().forEach(x => x.isMoving = false)
    }
    deleteSelectedShapes() {
        for (let shapeToDelete of this.selectedShapes()) {
            this.deleteShape(shapeToDelete)
        }
    }
}

class RelevantPoint {
    constructor(shapeOrMeasureOrInput, namePrefix, percentualX, percentualY) {
        //Yeah, I know shapeOrMeasureOrInput ... but coming up with a variable named anObject or something like that was not expressive enough for me
        this.shapeOrMeasureOrInput = shapeOrMeasureOrInput
        this.namePrefix = namePrefix;
        this.percentualX = percentualX;
        this.percentualY = percentualY;
        this.isHandler = [0, 1].includes(percentualX) && [0, 1].includes(percentualY)
    }
    left(size) {
        return this.centerX - size / 2
    }
    top(size) {
        return this.centerY - size / 2
    }
    get centerX() {
        return this.shapeOrMeasureOrInput.deltaX * this.percentualX
    }
    get centerY() {
        return this.shapeOrMeasureOrInput.deltaY * this.percentualY
    }
    isInside(x,y,size) {
        return x > this.centerX - size && x < this.centerX + size && y > this.centerY - size && y < this.centerY + size
    }
}

class InputEvent {
    constructor({ type: type, touches: touches, timeStamp: timeStamp }) {
        this.type = type
        this.touches = []
        for (let eachTouchObject of touches) {
            this.touches.push(new InputEventTouch(eachTouchObject))
        }
        this.timeStamp = timeStamp
        this.testShapes = []
    }
    get leanJSON() {
        //Removing testShapes from the inputEvent
        return {type: this.type, touches: this.touches.map(x => x.leanJSON), timeStamp: this.timeStamp }
    }
    touchFor(touchId) {
        return this.touches.find(aTouch => aTouch.id == touchId)
    }
}

class InputEventTouch {
    constructor({identifier:identifier,x:x,y:y,pageX:pageX,pageY:pageY,radiusX:radiusX,radiusY:radiusY,angularRotation:angularRotation,force:force}) {
        this.identifier = identifier;
        this.id = 'F'+identifier
        this.name = this.id
        //hack
        if (x!=undefined || y != undefined) {
            this.x = x
            this.y = y
        } else if (pageX!=undefined || pageY != undefined) {
            this.x = pageX
            this.y = pageY
        }
        this.radiusX = radiusX
        this.radiusY = radiusY
        this.angularRotation = angularRotation
        this.force = force
        this.highlight = false
    }
    get leanJSON() {
        console.log("InputEventTouch >> " + JSON.stringify({identifier: this.identifier,x: this.x, y: this.y, radiusX: this.radiusX, radiusY: this.radiusY, angularRotation: this.angularRotation, force: this.force }))
        //TODO check why angularRotation is not appearing, apparently when a value it is undefined cannot be added to the final JSON
        return {identifier: this.identifier, x: this.x, y: this.y, radiusX: this.radiusX, radiusY: this.radiusY, angularRotation: this.angularRotation, force: this.force }
    }
    positionOfHandler(handlerName) {
        if (handlerName == 'center') {
            return {x: this.x,y:this.y}
        } else {
            console.log("Unrecognized handlerName in InputEventTouch: " + handlerName)
        }
    }
    get deltaX() {
        return this.radiusX * 2
    }
    get deltaY() {
        return this.radiusY * 2
    }
    diffArray(comparingTouch) {
        let changes = []

        if (this.x != comparingTouch.x || this.y != comparingTouch.y) {
            changes.push({id: this.id, name: this.name, type: 'touch', property: { name: "position" , before: { x: this.x, y: this.y }, after: { x: comparingTouch.x, y: comparingTouch.y } } })
        }
        if (this.radiusX != comparingTouch.radiusX || this.radiusY != comparingTouch.radiusY) {
            changes.push({id: this.id, name: this.name, type: 'touch', property: { name: "size" , before: { x: this.radiusX, y: this.radiusY }, after: { x: comparingTouch.radiusX, y: comparingTouch.radiusY } } })
        }
        return changes
    }
    valueForProperty(propertyName) {
        switch (propertyName) {
            case 'position': {
                return {x:this.x, y:this.y}
            }
            case 'size': {
                return {x: this.radiusX, y: this.radiusX}
            }
            default: {
                console.log("InputEventTouch >> valueForProperty, Unrecognized property name: " + propertyName)
            }
        }
    }
}

class ShapeModel {
    constructor(id, aMasterVersion, aColor = '', left = null, top = null, width = null, height = null) {
        this.id = id;
        this.name = id;

        this.opacity = 1

        this._color = aColor
        this._position = {
            x: left,
            y: top
        };
        this._size = {
            x: width,
            y: height
        };
        this.masterVersion = aMasterVersion;
        this.highlight = false
        this.isSelected = false
        this.isResizing = false
        this.isMoving = false
    }

    static createShape(shapeType,shapeId,protoShape) {
        if (!shapeId) {
            console.log("ShapeModel class >> createShape, I'm pretty sure that shapeId needs to be defined")
        }
        switch (shapeType) {
            case 'rectangle': {
                if (protoShape) {
                    return new RectangleModel(shapeId, protoShape)
                }
                return new RectangleModel(shapeId, protoShape, '#ffffff', 0, 0, 0, 0)
            }
            case 'polygon': {
                if (protoShape) {
                    return new PolygonModel(shapeId, protoShape)
                }
                return new PolygonModel(shapeId, protoShape, '#ffffff', 0, 0, 0, 0)
            }
            default: {
                console.log("Unrecognized shapeType in static ShapeModel.createShape :" + shapeType)
            }
        }
    }

    testAgainst(testShape) {

        return this.allProperties.every(prop => this.areEqualValues(prop,this.valueForProperty(prop),testShape.valueForProperty(prop)))
        // if (this.left != Math.round(testShape.left)) {
        //     console.log("LEFT DIFF: " + (this.left - testShape.left))
        // }
        // if (this.top != Math.round(testShape.top)) {
        //     console.log("TOP DIFF: " + (this.top - testShape.top))
        // }
        // if (this.width != Math.round(testShape.width)) {
        //     console.log("WIDTH DIFF: " + (this.width - testShape.width))
        // }
        // if (this.height != Math.round(testShape.height)) {
        //     console.log("HEIGHT DIFF: " + (this.height - testShape.height))
        // }
        // return Math.abs(this.left - testShape.left) < 0.3 && Math.abs(this.top,testShape.top) < 0.3 && Math.abs(this.width,testShape.width) < 0.3 && Math.abs(this.height,testShape.height) < 0.3 && this.color == testShape.color
    }

    prepareForDeletion() {
        throw "ShapeModel >> prepareForDeletion: Subclass Responsibility"
    }

    get handlers() {
        return this.relevantPoints.filter(eachPoint => eachPoint.isHandler)
    }

    cssText(opacityValue = 1) {
        return 'background-color:' + this.color + ";" +
            'position:' + 'absolute' + ";" +
            'left:' + this.left + 'px' + ";" +
            'top:' + this.top + 'px' + ";" +
            'width:' + this.width + 'px' + ";" +
            'height:' + this.height + 'px' + ";" +
            'border:' + ('1px') + ' solid gray' + ";" +
            'overflow:' + 'visible' + ";" +
            'opacity:' + opacityValue
    }
    //deltaX to be used by the RelevantPoint
    get deltaX() {
        return this.width
    }
    get deltaY() {
        return this.height
    }

    get left() {
        return this.position.x
    }
    get top() {
        return this.position.y
    }
    get width() {
        return this.size.x
    }
    get height() {
        return this.size.y
    }
    get color() {
        if (this.isFollowingMaster('color')) {
            return this.masterVersion.color
        }
        return this._color
    }
    get position() {
        if (this.isFollowingMaster('position')) {
            return this.masterVersion.position;
        }
        return this._position;
    }
    get size() {
        if (this.isFollowingMaster('size')) {
            return this.masterVersion.size;
        }
        return this._size;
    }
    set top(value) {
        this._position.y = value;
    }
    set left(value) {
        this._position.x = value;
    }
    set width(value) {
        this._size.x = value;
    }
    set height(value) {
        this._size.y = value;
    }
    set color(value) {
        this._color = value;
    }
    followMaster(property) {
        switch (property) {
            case 'color':
                this._color = '';
                break;
            case 'position':
                this._position.x = null;
                this._position.y = null;
                break;
            case 'size':
                this._size.x = null;
                this._size.y = null;
                break;
        }
    }
    setOwnPropertiesFromMaster(property) {
        switch (property) {
            case 'color': {
                this.color = this.color
                break;
            }
            case 'position': {
                this.left = this.left
                this.top = this.top
                break;
            }
            case 'size':{
                this.width = this.width
                this.height = this.height
                break;
            }
            case '':
            default: {
                for (let eachProperty of this.allProperties) {
                    this.setOwnPropertiesFromMaster(eachProperty)
                }
                break;
            }
        }
    }
    get allProperties() {
        return ['color','position','size']
    }
    unfollowMaster(property) {
        if (this.masterVersion) {
            this.setOwnPropertiesFromMaster(property)
            this.masterVersion = undefined
        }
    }
    changeOwnProperty(changedPropertyName,changedValue) {
        // this[changePropertyName] = changedValue
        switch (changedPropertyName) {
            case 'position': {
                this.left = changedValue.x
                this.top = changedValue.y
                break;
            }
            case 'size': {
                this.width = changedValue.x
                this.height = changedValue.y
                break;
            }
            case 'color': {
                this.color = changedValue
                break;
            }
            default: {
                console.log("VisualStateModel >> changeProperty, unrecognized propertyName: " + propertyName)
            }
        }
    }
    isFollowingMaster(property) {
        switch (property) {
            case 'color':{
                return this._color == '';
            }
            case 'position':{
                return this._position.x == null && this._position.y == null;
            }
            case 'size':{
                return this._size.x == null && this._size.y == null;
            }
        }
        // "check all properties" //TODO what about vertices???
        return this.isFollowingMaster('color') && this.isFollowingMaster('position') && this.isFollowingMaster('size')
    }
    valueForProperty(property) {
        return this[property];
    }
    areEqualValues(property, value1, value2) {
        switch (property) {
            case 'color':{
                return value1 == value2;
            }
            case 'position':{
                return value1.x == value2.x && value1.y == value2.y;
            }
            case 'size':{
                return value1.x == value2.x && value1.y == value2.y;
            }
        }
    }
    isPointInside(x, y) {
        return this.top < y && this.left < x && x < this.left + this.width && y < this.top + this.height;
    }
    diffArray(nextShapeWithTheSameModel) {
        let changes = []
        if (!nextShapeWithTheSameModel.isFollowingMaster('color') && !this.areEqualValues('color', this.color, nextShapeWithTheSameModel.color)) {
            // changes.push('Changed color from ' + this.color + ' to ' + nextShapeWithTheSameModel.color)
            changes.push({ id: this.id, name: this.name, type: 'shape', property: { name: "color", before: this.color, after: nextShapeWithTheSameModel.color } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('position') && !this.areEqualValues('position', this.position, nextShapeWithTheSameModel.position)) {
            // changes.push('Changed position from ' + JSON.stringify(this.position) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.position))
            changes.push({ id: this.id, name: this.name, type: 'shape', property: { name: "position", before: this.position, after: nextShapeWithTheSameModel.position } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('size') && !this.areEqualValues('size', this.size, nextShapeWithTheSameModel.size)) {
            // changes.push('Changed size from ' + JSON.stringify(this.size) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.size))
            changes.push({ id: this.id, name: this.name, type: 'shape', property: { name: "size", before: this.size, after: nextShapeWithTheSameModel.size } })
        }
        return changes
    }
    positionOfHandler(handlerName) {
        switch (handlerName) {
            case 'northEast':{
                return { x: this.left + this.width, y: this.top }
            }
            case 'northWest':{
                return { x: this.left, y: this.top }
            }
            case 'southWest':{
                return { x: this.left, y: this.top + this.height }
            }
            case 'southEast':{
                return { x: this.left + this.width, y: this.top + this.height }
            }
            case 'middleRight':{
                return { x: this.left + this.width, y: this.top + this.height / 2 }
            }
            case 'middleLeft':{
                return { x: this.left, y: this.top + this.height / 2 }
            }
            case 'middleTop':{
                return { x: this.left + this.width / 2, y: this.top }
            }
            case 'middleBottom':{
                return { x: this.left + this.width / 2, y: this.top + this.height }
            }
            case 'center':{
                return { x: this.left + this.width / 2, y: this.top + this.height / 2 }
            }
        }
        console.log("WERIDDDDDDDDDD")
    }
    deselect() {
        this.isSelected = false
    }
}

class RectangleModel extends ShapeModel {
    constructor(id, aMasterVersion, aColor = '', left = null, top = null, width = null, height = null) {
        super(id, aMasterVersion, aColor, left, top, width, height)
        this.relevantPoints = [new RelevantPoint(this, 'northWest', 0, 0), new RelevantPoint(this, 'northEast', 1, 0), new RelevantPoint(this, 'southEast', 1, 1), new RelevantPoint(this, 'southWest', 0, 1), new RelevantPoint(this, 'middleRight', 1, 0.5), new RelevantPoint(this, 'middleLeft', 0, 0.5), new RelevantPoint(this, 'middleTop', 0.5, 0), new RelevantPoint(this, 'middleBottom', 0.5, 1), new RelevantPoint(this, 'center', 0.5, 0.5)];
    }
    get type() {
        return "rectangle"
    }
    prepareForDeletion() {
        for (let point of this.relevantPoints) {
            point.shape = undefined
        }
    }

    toJSON() {
        let json = {}
        for (let eachKey of ['id','type','color','top','left','width','height','opacity']) {
            json[eachKey] = this[eachKey]
        }
        return json
    }

    fromJSON(json) {
        // this.id = json.id
        // this.type = json.type
        if (json.color) {
            this.color = json.color
        }
        if (json.top) {
            this.top = json.top
        }
        if (json.left) {
            this.left = json.left
        }
        if (json.width) {
            this.width = json.width
        }
        if (json.height){
            this.height = json.height
        }
        if (json.opacity) {
            this.opacity = json.opacity
        }
    }
}

class PolygonModel extends ShapeModel {
    constructor(id, aMasterVersion, aColor = '', left = null, top = null, width = null, height = null) {
        super(id, aMasterVersion, aColor, left, top, width, height)
        this._vertices = []
        if (aMasterVersion) {
            for (let i=0;i<aMasterVersion.amountOfVertices;i++) {
                Vue.set(this._vertices,i,undefined)
            }
        }
        // this.relevantPoints = [new RelevantPoint(this, 'northWest', 0, 0), new RelevantPoint(this, 'northEast', 1, 0), new RelevantPoint(this, 'southEast', 1, 1), new RelevantPoint(this, 'southWest', 0, 1), new RelevantPoint(this, 'middleRight', 1, 0.5), new RelevantPoint(this, 'middleLeft', 0, 0.5), new RelevantPoint(this, 'middleTop', 0.5, 0), new RelevantPoint(this, 'middleBottom', 0.5, 1), new RelevantPoint(this, 'center', 0.5, 0.5)];
    }
    prepareForDeletion() {
        //Nothing to clean, the vertex doesn't know the Polygon

        // for (let vertex of this._vertices) {
        //     vertex.shape = undefined
        // }
    }
    get handlers() {
        return this.vertices
    }
    diffArray(nextShapeWithTheSameModel) {
        let changes = []
        if (!nextShapeWithTheSameModel.isFollowingMaster('color') && !this.areEqualValues('color', this.color, nextShapeWithTheSameModel.color)) {
            // changes.push('Changed color from ' + this.color + ' to ' + nextShapeWithTheSameModel.color)
            changes.push({ id: this.id, name: this.name, type: 'shape', property: { name: "color", before: this.color, after: nextShapeWithTheSameModel.color } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('position') && !this.areEqualValues('position', this.position, nextShapeWithTheSameModel.position)) {
            // changes.push('Changed position from ' + JSON.stringify(this.position) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.position))
            changes.push({ id: this.id, name: this.name, type: 'shape', property: { name: "position", before: this.position, after: nextShapeWithTheSameModel.position } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('size') && !this.areEqualValues('size', this.size, nextShapeWithTheSameModel.size)) {
            // changes.push('Changed size from ' + JSON.stringify(this.size) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.size))
            changes.push({ id: this.id, name: this.name, type: 'shape', property: { name: "size", before: this.size, after: nextShapeWithTheSameModel.size } })
        }
        for (let i of this.vertexIndexes) {
            if (!nextShapeWithTheSameModel.isFollowingMaster(i) && !this.areEqualValues(i, this.vertexFor(i), nextShapeWithTheSameModel.vertexFor(i))) {
                changes.push({ id: this.id, name: this.name, type: 'shape', property:{ name: "vertex", before: this.vertexFor(i), after: nextShapeWithTheSameModel.vertexFor(i) } })
            }
        }

        return changes
    }
    get vertexIndexes() {
        return [...Array(this.amountOfVertices).keys()]
    }
    get vertices() {
        return this.vertexIndexes.map(i => this.vertexFor(i))
    }
    get amountOfVertices() {
        return this._vertices.length
    }
    get type() {
        return "polygon"
    }
    vertexFor(vertexIndex) {
        let myVertex = this._vertices[vertexIndex]
        if (myVertex) {
            return myVertex
        }
        if (this.masterVersion) {
            return this.masterVersion.vertexFor(vertexIndex)
        }
        return undefined
    }
    addVertex(canvasPosition) {
        this._vertices.push(new Vertex(this._vertices.length,canvasPosition))
    }
    // get isClosed() {
    //     if (this._vertices.length < 2) {
    //         return false
    //     }
    //     let firstVertex = this._vertices[0]
    //     let lastVertex = this._vertices[this._vertices.length - 1]
    //     return firstVertex.x == lastVertex.x && firstVertex.y == lastVertex.y
    // }
    isVertexProperty(propertyName) {
        return !isNaN(propertyName)
    }

    followMaster(property) {
        if (this.isVertexProperty(property)) {
            // this._vertices[property] = undefined
            Vue.set(this._vertices,property,undefined)
        } else {
            super.followMaster(property)
        }
    }
    setOwnPropertiesFromMaster(property) {
        if (this.isVertexProperty(property)) {
            // Vue.set(target,key,value)
            Vue.set(this._vertices,property,new Vertex(property,this.vertexFor(property)))
            // this._vertices[property] = new Vertex(this,this.vertexFor(property))
        } else {
            super.setOwnPropertiesFromMaster(property)
        }
    }
    get allProperties() {
        let previousProperties = [...super.allProperties]
        for (let i=0;i<this._vertices.length;i++) {
            previousProperties.push(i)
        }
        return previousProperties
    }
    isFollowingMaster(property) {
        if (this.isVertexProperty(property)) {
            return this._vertices[property] == undefined
        }
        return super.isFollowingMaster(property)
    }
    changeOwnProperty(changedPropertyName,changedValue) {
        if (this.isVertexProperty(changedPropertyName)) {
            //It's a number => It's a vertex
            let correspondingVertex = this._vertices[changedPropertyName]
            if (!correspondingVertex) {
                // Vue.set(target,key,value)
                Vue.set(this._vertices,changedPropertyName,new Vertex(changedPropertyName,changedValue))
                // this._vertices[changedPropertyName] = new Vertex(this,changedValue)
            } else {
                correspondingVertex.x = changedValue.x
                correspondingVertex.y = changedValue.y
            }
        } else {
            super.changeOwnProperty(changedPropertyName,changedValue)
        }
    }
    valueForProperty(property) {
        if (this.isVertexProperty(property)) {
            return this.vertexFor(property)
        } else {
            return super.valueForProperty(property)
        }
    }
    areEqualValues(property, value1, value2) {
        // console.log("Checking " + property + " v1: " + JSON.stringify(value1) + " v2:" + JSON.stringify(value2))
        if (this.isVertexProperty(property)) {
            return value1.x == value2.x && value1.y == value2.y
        } else {
            return super.areEqualValues(property, value1, value2)
        }
    }
    toJSON() {
        let verticesJSON = []
        for (let eachVertex of this.vertices) {
            verticesJSON.push(eachVertex.toJSON())
        }
        return {id:this.id,type: this.type, color:this.color,position:{x:this.position.x,y:this.position.y},vertices:verticesJSON}
    }
    fromJSON(json) {
        // this.id = json.id
        // this.type = json.type
        if (json.color) {
            this.color = json.color
        }
        if (json.position) {
            this.left = json.position.x
            this.top = json.position.y
        }
        if (json.vertices) {
            for (let i=0;i<json.vertices.length;i++) {
                let eachJSONVertex = json.vertices[i]
                let vertex = this.vertexFor(eachJSONVertex.id)
                if (vertex) {
                    vertex.x = eachJSONVertex.x
                    vertex.y = eachJSONVertex.y
                } else {
                    Vue.set(this._vertices,eachJSONVertex.id,new Vertex(eachJSONVertex.id,eachJSONVertex))
                }
            }
        }
    }
}

class Vertex {
    constructor(id,{x:canvasX,y:canvasY}) {
        this.id = id
        this.x = canvasX
        this.y = canvasY
        this.highlight = false
    }
    top(aShape) {
        return this.y + aShape.position.y
    }
    left(aShape) {
        return this.x + aShape.position.x
    }
    get namePrefix() {
        return this.id
    }
    toJSON() {
        return {id:this.id,x:this.x,y:this.y}
    }
}

class LineModel extends ShapeModel {

}

class RulePlaceholderModel {
    constructor(id) {
        this.id = id;
        // this.input = { type: undefined, id: undefined, property: undefined, axiss: [], min: undefined, max: undefined };
        this.input = new RuleSidePlaceholder({type:undefined,id:undefined,property:undefined})
        this.factor = {x:1,y:1}
        // this.output = { type: undefined, id: undefined, property: undefined, axiss: [], min: undefined, max: undefined };
        this.outputs = [new RuleSidePlaceholder({type:undefined,id:undefined,property:undefined})]
    }
    dropForInput(diffModel) {
        this.input.droppedDiff(diffModel)
    }
    dropForOutput(outputRule,diffModel) {
        outputRule.droppedDiff(diffModel)
    }
    toJSON() {
        let outputsJSON = []
        for (let eachOutputRuleSidePlaceholder of this.outputs) {
            outputsJSON.push(eachOutputRuleSidePlaceholder.toJSON())
        }
        return {id:this.id,input:this.input.toJSON(),factor:this.factor,outputs:outputsJSON}
    }

    get isComplete() {
        return this.input.isComplete && this.outputs.some(eachOutput => eachOutput.isComplete)
    }
}

class RuleSidePlaceholder {
    constructor({type,id,property}) {
        if (property) {
            debugger;
        }
        this.type = type
        this.id = id
        this.name = name
        this.property = property
        this.axisX = new RuleAxis(this,'x')
        this.axisY = new RuleAxis(this,'y')
    }
    droppedDiff(diffModel) {
        this.type = diffModel.type
        this.id = diffModel.id
        this.name = diffModel.name
        this.property = {id: diffModel.property.id, name: diffModel.property.name}
        this.axisX.isActive = diffModel.delta.x != 0
        this.axisY.isActive = diffModel.delta.y != 0
    }
    get axiss() {
        let axiss = []
        if (this.axisX.isActive) {
            axiss.push('x')
        }
        if (this.axisY.isActive) {
            axiss.push('y')
        }
        return axiss
    }
    set axiss(axissNameArray) {
        this.axisX.isActive = false
        this.axisY.isActive = false

        for (let eachAxisName of axissNameArray) {
            if (eachAxisName == 'x') {
                this.axisX.isActive = true
            }
            if (eachAxisName == 'y') {
                this.axisY.isActive = true
            }
        }
    }
    toJSON() {
        return { type: this.type, id: this.id, property: this.property, axiss: this.axiss, min: {x:this.axisX.min,y:this.axisY.min}, max: {x:this.axisX.max,y:this.axisY.max} }
    }
    getValue(element,axisName) {
        return element[this.property.name][axisName]
    }
    get isComplete() {
        return this.axisX.isActive || this.axisY.isActive
    }
}

class RuleAxis {
    constructor(ruleSide,name) {
        this.ruleSide = ruleSide
        this.name = name
        this._min = undefined
        this._max = undefined
        this.isActive = false
        this.minElement = undefined
        this.maxElement = undefined
    }
    get min() {
        if (this._min) {
            return this._min
        }
        if (this.minElement) {
            return this.ruleSide.getValue(this.minElement,this.name)
        }
        return undefined
    }
    set min(value) {
        this._min = value
        this.minElement = undefined
    }
    get max() {
        if (this._max) {
            return this._max
        }
        if (this.maxElement) {
            return this.ruleSide.getValue(this.maxElement,this.name)
        }
        return undefined
    }
    set max(value) {
        this._max = value
        this.maxElement = undefined
    }
    loadElement(maxOrMin,element,propertyName) {
        if (maxOrMin == 'min') {
            if (!this.ruleSide.property) {
                this.ruleSide.property = {id:undefined, name: propertyName}
            }
            this.minElement = element
        }
        if (maxOrMin == 'max') {
            if (!this.ruleSide.property) {
                this.ruleSide.property = {id:undefined, name: propertyName}
            }
            this.maxElement = element
        }
    }
    toggleActive(){
        this.isActive=!this.isActive
    }
}

class MinMaxRule {
    constructor() {
        this.minX = undefined;
        this.minY = undefined;
        this.maxX = undefined;
        this.maxY = undefined;
    }
    get minX() {
        if (this._minX) {
            return this._minX
        }
        return -Number.MAX_VALUE
    }
    get minY() {
        if (this._minY) {
            return this._minY
        }
        return -Number.MAX_VALUE
    }
    set minX(aValue) {
        this._minX = aValue
    }
    set minY(aValue) {
        this._minY = aValue
    }
    get maxX() {
        if (this._maxX) {
            return this._maxX
        }
        return Number.MAX_VALUE
    }
    get maxY() {
        if (this._maxY) {
            return this._maxY
        }
        return Number.MAX_VALUE
    }
    set maxX(aValue) {
        this._maxX = aValue
    }
    set maxY(aValue) {
        this._maxY = aValue
    }
}

class ShapeOutputRule extends MinMaxRule {
    constructor(shapeId, property, axis) {
        super()
        this.id = shapeId;
        this.property = property;
        this.axis = axis;
        this.currentOutput = undefined;
    }
    shouldActivate() {
        console.log("ShapeOutputRule >> shouldActivate, this.property != undefined, property = " + JSON.stringify(this.property))
        return this.id != undefined && this.property != undefined && this.axis.length > 0
    }
}

class RuleModel {
    constructor(id, input, outputs) {
        this.id = id;
        this.input = input;
        if (outputs) {
            this.outputs = outputs
        } else {
            this.outputs = [];
        }
        this.factor = {x:1,y:1}
        this.enforce = true;
    }
    activate(anEvent, globalShapeDictionary) {
        if (this.input && this.input.shouldActivate(this, anEvent)) {
            this.currentEvent = anEvent

            this.input.activate()

            for (let eachOutputRule of this.outputs) {
                //Does it affect one of the current shapes?
                let controlledShapeVM = globalShapeDictionary[eachOutputRule.id]
                if (controlledShapeVM) {
                    eachOutputRule.currentOutput = controlledShapeVM.shapeModel
                }
            }
            return true
        }
        return false
    }
    applyNewInput(newEvent, globalShapeDictionary) {
        // let touch = event.touches[0]
        this.input.applyNewInput(this, newEvent, globalShapeDictionary)
        this.currentEvent = newEvent
    }
    actuallyApply(delta, newEvent, globalShapeDictionary) {
        for (let eachOutputRule of this.outputs) {
            if (!this.input.condition(newEvent, eachOutputRule)) {
                console.log("We are not passing the input condition")
                continue;
            }
            for (let i=0;i<eachOutputRule.axis.length;i++) {
                let eachOutputAxis = eachOutputRule.axis[i];
                let correspondingInputAxis = this.input.axis[i];
                if (!correspondingInputAxis) {
                    console.log("the rule does not have an input axis defined for that output axis, but we assume that the first will be used")
                    correspondingInputAxis = this.input.axis[0];
                }

                let outputProperty = undefined
                let complementaryProperty = undefined

                switch (eachOutputRule.property.name) {
                    case 'center': {
                        outputProperty = 'center'
                        break;
                    }
                    case 'position': {
                        if (eachOutputRule.property.id == undefined) {
                            outputProperty = 'position'
                        } else {
                            //It's a vertex
                            outputProperty = eachOutputRule.property.id
                        }
                        break;
                    }
                    case 'size': {
                        outputProperty = 'size'
                        complementaryProperty = 'position';
                        break;
                    }
                    default: {
                        console.log("RuleModel >> actuallyApply: Unrecognized output property " + eachOutputRule.property.name)
                    }
                }

                let currentOutputValue = eachOutputRule.currentOutput.valueForProperty(outputProperty)
                let newValue = currentOutputValue[eachOutputAxis] + delta[correspondingInputAxis] * this.factor[correspondingInputAxis]

                //Checking the min/max of the output
                if (newValue > eachOutputRule['min' + eachOutputAxis.toUpperCase()] && newValue < eachOutputRule['max' + eachOutputAxis.toUpperCase()]) {
                    currentOutputValue[eachOutputAxis] = newValue
                    // if (complementaryProperty) {
                    //     let currentComplementaryValue = eachOutputRule.currentOutput.valueForProperty(complementaryProperty)
                    //     currentComplementaryValue[eachOutputAxis] = currentComplementaryValue[eachOutputAxis] + (delta[correspondingInputAxis] / 2) * this.factor[correspondingInputAxis]
                    // }
                }
            }
        }
    }
}

class InputRule extends MinMaxRule {
    constructor() {
        super()
    }
}

class TouchInput extends InputRule {
    constructor(touchId, property, listOfAxis) {
        super()
        this.touchId = touchId
        this.property = property
        this.axis = listOfAxis
    }
    condition(event, anOutputRule) {
        let touch = this.touchFor(event)

        return this.axis.every(function(eachAxis) {
            let result = touch['page' + eachAxis.toUpperCase()] > this['min' + eachAxis.toUpperCase()] && touch['page' + eachAxis.toUpperCase()] < this['max' + eachAxis.toUpperCase()]
            console.log(`TouchInput >> condition: min ${this['min' + eachAxis.toUpperCase()]} max ${this['max' + eachAxis.toUpperCase()]} => RESULT: ${result}`)
            return result
        }.bind(this))
    }
    shouldActivate(aRule, anEvent) {
        //The event has the corresponding touch
        console.log("TouchInput >> shouldActivate, this.property != undefined, property = " + JSON.stringify(this.property))

        return this.touchId != undefined && anEvent.touches[this.touchId] != undefined && this.property != undefined && this.axis.length > 0
    }
    touchFor(event) {
        return event.touches[this.touchId]
    }
    applyNewInput(aRule, newEvent, globalShapeDictionary) {

        let touch = newEvent.touches[this.touchId]

        if (!touch) {
            console.log("TouchInput >> applyNewInput: input type " + newEvent.type +  " there isn't a touch = " + touch)
            return
        }

        let previousTouch = aRule.currentEvent.touches[this.touchId]

        let delta = { x: 0, y: 0 }
        switch (this.property.name) {
            case 'position': {
                for (let eachInputAxis of this.axis) {
                    delta[eachInputAxis] = touch['page' + eachInputAxis.toUpperCase()] - previousTouch['page' + eachInputAxis.toUpperCase()]
                }
                break;
            }
            case 'size': {
                for (let eachInputAxis of this.axis) {
                    delta[eachInputAxis] = touch['radius' + eachInputAxis.toUpperCase()] - previousTouch['radius' + eachInputAxis.toUpperCase()]
                }
                break;
            }
            default: {
                console.log("Unrecognized property name in TouchInput >> applyNewInput: " + this.property.name)
            }
        }

        aRule.actuallyApply(delta, newEvent, globalShapeDictionary)
    }
    activate() {

    }
}

class MeasureInput extends InputRule {
    constructor(measureObject, property, listOfAxis, previousValue) {
        //TODO do we really need a previous value parameter? Should we initialize it as {x:undefined,y:undefined}?
        super()
        this.measureObject = measureObject
        this.property = property
        this.previousValue = previousValue
        this.axis = listOfAxis;
    }
    shouldActivate(aRule, anEvent) {
        //For now, the measure rules should be always active (maybe if the related shaped are not present this should be false)
                console.log("MeasureInput >> shouldActivate, this.property != undefined, property = " + JSON.stringify(this.property))

        return this.measureObject != undefined && this.property != undefined && this.axis.length > 0;
    }
    condition(event, anOutputRule) {
        let currentValue = this.currentMeasuredValue()
        if (!currentValue) {
            return false
        }
        let result = this.axis.every(eachAxis => currentValue[eachAxis] > this['min' + eachAxis.toUpperCase()] && currentValue[eachAxis] < this['max' + eachAxis.toUpperCase()])
        console.log("MeasureInput >> condition = " + result)
        return result
    }

    applyNewInput(aRule, newEvent, globalShapeDictionary) {
        let newValue = this.currentMeasuredValue()

        let delta = { x: 0, y: 0 }

        if (newValue) {
            for (let eachInputAxis of this.axis) {
                delta[eachInputAxis] = newValue[eachInputAxis] - this.previousValue[eachInputAxis]
                this.previousValue[eachInputAxis] = newValue[eachInputAxis]
            }
        }
        aRule.actuallyApply(delta, newEvent, globalShapeDictionary)
    }
    currentMeasuredValue() {
        if (!this.measureObject.fromObject || !this.measureObject.toObject) {
            return undefined
        }
        switch(this.property.name) {
            case 'position': {
                return this.measureObject.initialPoint
            }
            case 'size': {
                return {x:this.measureObject.width,y:this.measureObject.height}
            }
            default: {
                console.log("MeasureInput >> currentMeasuredValue, unrecognized property: "+this.property.name)
            }
        }
    }
    activate() {
        this.previousValue = this.currentMeasuredValue()
    }
}

class ShapeInput extends InputRule {
    constructor(shapeObject, property, listOfAxis, previousValue) {
        //TODO do we really need a previous value parameter? Should we initialize it as {x:undefined,y:undefined}?
        super()
        this.shapeObject = shapeObject
        this.property = property
        this.previousValue = previousValue
        this.axis = listOfAxis;
    }
    shouldActivate(aRule, anEvent) {
        //For now, the measure rules should be always active (maybe if the related shaped are not present this should be false)
                console.log("ShapeInput >> shouldActivate, this.property != undefined, property = " + JSON.stringify(this.property))

        return this.shapeObject != undefined && this.property != undefined && this.axis.length > 0;
    }
    condition(event, anOutputRule) {
        let currentValue = this.currentShapeValue()
        let result = this.axis.every(eachAxis => currentValue[eachAxis] > this['min' + eachAxis.toUpperCase()] && currentValue[eachAxis] < this['max' + eachAxis.toUpperCase()])
        console.log("ShapeInput >> condition = " + result)
        return result

    }
    applyNewInput(aRule, newEvent, globalShapeDictionary) {
        let newValue = this.currentShapeValue()

        let delta = { x: 0, y: 0 }
        for (let eachInputAxis of this.axis) {
            delta[eachInputAxis] = newValue[eachInputAxis] - this.previousValue[eachInputAxis]
            this.previousValue[eachInputAxis] = newValue[eachInputAxis]
        }

        aRule.actuallyApply(delta, newEvent, globalShapeDictionary)
    }
    currentShapeValue() {
        return this.shapeObject.valueForProperty(this.property.name)
    }
    activate() {
        this.previousValue = {x: this.currentShapeValue().x ,y: this.currentShapeValue().y}
    }
}
