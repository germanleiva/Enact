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
import JSONfn from 'json-fn';

let isLoggerActive = false;
let logger = function(text) {
    if (isLoggerActive) {
        console.log(text);
    }
}

export { VisualStateModel, RectangleModel, PolygonModel, ShapeModel, MeasureModel, RelevantPoint, InputEvent, InputEventTouch, ObjectLink, RulePlaceholderModel, RuleSidePlaceholder, RuleModel, MeasureInput, TouchInput, ShapeInput, ShapeOutputRule, DiffModel, logger, StateMachine, SMFunction}

export const globalBus = new Vue();

export const globalStore = new Vue({
    data: {
        socket: undefined,
        mobileCanvasVM: undefined,
        visualStates: [],
        deviceVisualState: undefined,
        codeEditor: undefined,
        inputEvents: [],
        isRecording: false,
        shapeCounter: 1,
        measureCounter: 1,
        ruleCounter: 1,
        stateCounter: 1,
        transitionCounter: 1,
        functionCounter: 1,
        stateMachine: undefined,
        isMetaPressed: false,
        toolbarState: {
            rectangleMode: false,
            circleMode: false,
            polygonMode: false,
            selectionMode: true,
            multiSelectionMode: false,
            measureMode: false,
            shapeType: 'rectangle',
            currentLink: undefined,
            currentColor: '#00d2b2',
        },
        cursorType: 'auto',
        context: undefined,
        rulesPlaceholders: [],
        mobileWidth: 410 + 2, //iPhone 375 Nexus 5X 410
        mobileHeight: 660//iPhone 667 Nexus 5X 660
    },
    computed: {
        isDrawMode() {
            return this.toolbarState.rectangleMode || this.toolbarState.circleMode || this.toolbarState.polygonMode
        }
    },
    methods: {
        refreshMobile() {
            //TODO This is not actually cleaning the mobile. Instantiated shapes are not deleted
            for (let visualState of globalStore.visualStates) {
                for (let shapeId in visualState.shapesDictionary) {
                    let masterShape = visualState.shapesDictionary[eachShapeId]
                    if (masterShape.masterVersion === undefined) {
                        globalStore.socket.emit('message-from-desktop', { type: "EDIT_SHAPE", id: shapeId, message: masterShape.toJSON() })
                    }
                }
            }
        },
        addVisualState(){
            var newVisualState = new VisualStateModel()

            if (globalStore.visualStates.length > 0) {
                let previousVisualState = globalStore.visualStates.last();

                for (let shapeKey in previousVisualState.shapesDictionary) {
                    let shape = previousVisualState.shapesDictionary[shapeKey]
                    newVisualState.addNewShape(shape.type,shapeKey,previousVisualState.shapesDictionary[shapeKey]);
                }

                newVisualState.importMeasuresFrom(previousVisualState);

                //TODO: Should we send didCreateShape?

                previousVisualState.nextState = newVisualState;
                newVisualState.previousState = previousVisualState;
            }
            globalStore.visualStates.push(newVisualState);

            //TODO DRY
            let correspondingIndex = Math.floor(newVisualState.percentageInTimeline / 100 * (globalStore.inputEvents.length -1))
            newVisualState.currentInputEvent = globalStore.inputEvents[correspondingIndex]

            return newVisualState
        },
        setSelectionMode() {
            this.toolbarState.rectangleMode = false;
            this.toolbarState.circleMode = false;
            this.toolbarState.polygonMode = false;
            this.toolbarState.selectionMode = true;
            this.toolbarState.measureMode = false;
            this.cursorType = "default";
        },
        setRectangleMode() {
            this.toolbarState.rectangleMode = true;
            this.toolbarState.circleMode = false;
            this.toolbarState.polygonMode = false;
            this.toolbarState.selectionMode = false;
            this.toolbarState.measureMode = false;
            this.cursorType = "crosshair";
        },
        setCircleMode() {
            this.toolbarState.rectangleMode = false;
            this.toolbarState.circleMode = true;
            this.toolbarState.polygonMode = false;
            this.toolbarState.selectionMode = false;
            this.toolbarState.measureMode = false;
            this.cursorType = "crosshair";
        },
        setPolygonMode() {
            this.toolbarState.rectangleMode = false;
            this.toolbarState.circleMode = false;
            this.toolbarState.polygonMode = true;
            this.toolbarState.selectionMode = false;
            this.toolbarState.measureMode = false;
            this.cursorType = "crosshair";
        },
        setMeasureMode() {
            this.toolbarState.rectangleMode = false;
            this.toolbarState.circleMode = false;
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
                    for (let eachProperty of aNewShape.allProperties) {
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
                        for (let eachProperty of aNewShape.allProperties) {
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
    },
    created: function() {
        let address = window.location.href.split('/')[2]

        // let newSocket = io.connect('http://localhost:3000')
        this.socket = io.connect(address)

        if (address.includes("localhost")) {
            //isServer
            this.socket.on('message-from-device', function(data) {
                globalBus.$emit('message-from-device-'+data.type,data)
            });
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
    applyDelta(visualState,shapeModel,inversed) {
        let sign = 1
        if (inversed) {
            sign = -1
        }
        visualState.changeProperty(shapeModel,'position',shapeModel.position,{x:shapeModel.left+this.delta.x * sign,y:shapeModel.top+this.delta.y * sign})
    }
    get name() {
        return "position"
    }
}

class ScalingDiff extends PropertyDiff {
    get delta() {
        return {x: this.after.x - this.before.x , y: this.after.y - this.before.y }
    }
    applyDelta(visualState,shapeModel,inversed=false) {
        let sign = 1
        if (inversed) {
            sign = -1
        }
        visualState.changeProperty(shapeModel,'size',shapeModel.size,{width:shapeModel.width+this.delta.x * sign,height:shapeModel.height+this.delta.y * sign})
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

    applyDelta(visualState,shapeModel,inversed=false) {
        let sign = 1
        if (inversed) {
            sign = -1
        }

        let deltaColorRgb = this.delta

        let originalColorRgb = tinyColor(shapeModel.color).toRgb()

        let newColorRgb = {}
        //white #ffffff (255,255,255) is boring
        for (let colorComponent of "rgb") {
            newColorRgb[colorComponent] = (originalColorRgb[colorComponent] + deltaColorRgb[colorComponent] * sign) //% 255
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
    applyDelta(visualState,shapeModel,inversed=false) {
        let sign = 1
        if (inversed) {
            sign = -1
        }
        let currentVertex = shapeModel.vertexFor(this.id)
        visualState.changeProperty(shapeModel,this.id,currentVertex,{x:currentVertex.x+this.delta.x * sign,y:currentVertex.y+this.delta.y * sign})
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
    applyDelta(visualState,shapeModel,inversed=false) {
        this.property.applyDelta(visualState,shapeModel,inversed)
    }
}

class MeasureModel {
    static calculateDistance(p1,p2) {
        return Math.sqrt( Math.pow(p1.x - p2.x,2) + Math.pow(p1.y - p2.y,2) )
    }

    constructor(visualState, from, to, cachedFinalPosition) {
        this.visualState = visualState
        this.from = from // {type, id, handler}
        this.to = to ? to : { type: undefined, id: undefined, handler: undefined }
        this.cachedInitialPosition = undefined
        this.cachedFinalPosition = cachedFinalPosition
        this.highlight = false
        this._relevantPoints = [new RelevantPoint(this, 'center', 0.5, 0.5)];
        this.idCount = -1
    }

    propertyMap() {
        return {"initialPoint":["x","y"],"finalPoint":["x","y"],"distance":[],"size":["width","height"]}
    }

    get allProperties() {
        return Object.keys(this.propertyMap())
    }

    get proxy() {
        return new Proxy(this,{
            ownKeys(target) {
                return target.allProperties
            },
            getPrototypeOf(target) {
                return null
            },
            get(target,key) {
                return target[key]
            }
        })
    }

    get distance() {
        let algo = MeasureModel.calculateDistance(this.initialPoint,this.finalPoint)
        return {
          [Symbol.toPrimitive](hint) {
            return algo;
          },
          valueOf: () => algo,
          toString: () => "" + algo,
          toJSON: () => algo,
          applyDelta: (input,min,max,ratio) => {
            console.log("MeasureModel >> distance")
            abort("Distances are inmutable")
          },
          delta: () => algo - (MeasureModel.calculateDistance(this.initialPoint.previous,this.finalPoint.previous))
        }
    }

    get id() {
        switch (this.type) {
            case "point":{
                return "P"+this.idCount
            }
            case "distance":{
                return "D"+this.idCount
            }
            default:{
                console.log("Unrecognized type for measure with name: "+ this.name);
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
    get name() {
        return this.id
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
            case 'touch':{
                return this.visualState.touchFor(fromId)
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
            case 'touch':{
                return this.visualState.touchFor(toId)
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

        if (this.isAvailable && nextMeasureWithTheSameModel.isAvailable) {
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
        console.log("MeasureModel >> positionOfHandler, WERIDDDDDDDDDD: " + handlerName)
    }
    deleteYourself() {
        let index = this.visualState.measures.indexOf(this)
        if (index >= 0) {
            this.visualState.measures.splice(index, 1)
        }
        this.visualState = undefined
    }
    get isAvailable() {
        let measureIsAvailable = (this.cachedInitialPosition != undefined || this.fromObject != undefined) && (this.cachedFinalPosition != undefined || this.toObject != undefined)
        let myMeasuresAreAvailable = true
        if (this.fromObject instanceof MeasureModel) {
            myMeasuresAreAvailable = this.fromObject.isAvailable
        }
        if (this.toObject instanceof MeasureModel) {
            myMeasuresAreAvailable = this.toObject.isAvailable
        }
        return measureIsAvailable && myMeasuresAreAvailable
    }
    valueForProperty(propertyName) {
        switch (propertyName) {
            case 'size': {
                return {width: this.width, height: this.height}
            }
            default: {
                console.log("MeasureModel >> valueForProperty, Unrecognized property name: " + propertyName)
            }
        }
    }
    toJSON() {
        return {idCount: this.idCount, from: this.from ,to: this.to}
    }
}

class ObjectLink {
    constructor({visualState,object,shifted = false}) {
        this.visualState = visualState
        this.object = object
        this._shifted = shifted
    }
    get shifted() {
        return this._shifted;
    }
    set shifted(newValue) {
        this.toggleObjectLink(false)
        this._shifted = newValue;
        this.toggleObjectLink(true)
    }

    toggleObjectLink(boolean) {
        if (this.shifted) {
            //toggle only the object
            this.object.highlight = boolean
        } else {
            //toggle all the objects
            for (let eachVS of globalStore.visualStates) {
                let objectFound = eachVS.objectFor(this.object.id)
                if (objectFound) {
                    objectFound.highlight = boolean
                }
            }
        }
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

    deleteYourself() {
        for (let aShapeModel of Object.values(this.shapesDictionary)) {
            this.deleteShape(aShapeModel)
        }
        for (let aMeasure of this.measures) {
            aMeasure.deleteYourself()
        }
        this.previousState = undefined;
        this.nextState = undefined;
    }

    toJSON() {
        let result = {name: this.name}
        result.shapes = {}
        let shapesJSON = {}
        for (let eachShapeKey in this.shapesDictionary) {
            result.shapes[eachShapeKey] = this.shapesDictionary[eachShapeKey].toJSON()
        }
        result.measures = []
        for (let aMeasure of this.measures) {
            result.measures.push(aMeasure.toJSON())
        }
        result.currentInputEventIndex = globalStore.inputEvents.indexOf(this.currentInputEvent)
        return result
    }

    get proxy() {
        return new Proxy(this,{
            ownKeys(target) {
                return target.allObjectNames
            },
            getPrototypeOf(target) {
                return null
            },
            get(target,key) {
                let object = target.objectFor(key)
                if (object) {
                    return object.proxy
                }
                return target[key]
            }
        })
    }

    get name() {
        return 'VS' + (globalStore.visualStates.indexOf(this) + 1)
    }

    get allObjects() {
        let allObjects = []
        for (let eachShapeKey in this.shapesDictionary) {
            allObjects.push(this.shapesDictionary[eachShapeKey])
        }
        for (let eachMeasure of this.measures) {
            allObjects.push(eachMeasure)
        }
        if (this.currentInputEvent) {
            for (let eachTouch of this.currentInputEvent.touches) {
                allObjects.push(eachTouch)
            }
        }
        return allObjects
    }

    get allObjectNames() {
        return this.allObjects.map(obj => obj.name)
    }

    objectFor(name) {
        let shape = this.shapeFor(name)
        if (shape) {
            return shape
        }

        let measure = this.measureFor(name)
        if (measure) {
            return measure
        }

        let touch = this.touchFor(name)
        if (touch) {
            return touch
        }

        return undefined
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
            logger("Don't do anything, keep following master and do not propagate")
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
    set currentInputEventIndex(anInputEventIndex) {
        if (anInputEventIndex < 0 || anInputEventIndex >= globalStore.inputEvents.length) {
            return
        }
        this.currentInputEvent = globalStore.inputEvents[anInputEventIndex]
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
            case 'shape':{
                for (let shapeKey in this.shapesDictionary) {
                    if (previousMeasure.from.id == shapeKey) {
                        //This VisualState has the starting Shape so we import the measure
                        return this.addNewMeasureUntilLastState(previousMeasure.idCount,previousMeasure.from.type, previousMeasure.from.id, previousMeasure.from.handler, previousMeasure.to.type, previousMeasure.to.id, previousMeasure.to.handler, previousMeasure.cachedFinalPosition)
                    }
                }
                break;
            }
            case 'distance':{
                for (let aMeasure of this.measures) {
                    if (previousMeasure.from.id == aMeasure.id) {
                        //This VisualState has the starting measure so we import the measure
                        return this.addNewMeasureUntilLastState(previousMeasure.idCount,previousMeasure.from.type, previousMeasure.from.id, previousMeasure.from.handler, previousMeasure.to.type, previousMeasure.to.id, previousMeasure.to.handler, previousMeasure.cachedFinalPosition)
                    }
                }
                break;
            }
            case 'touch':{
                // if (this.currentInputEvent) {
                    // if (this.currentInputEvent.touches.some(aTouch => aTouch.id == previousMeasure.from.id)) {
                        //This VisualState has the starting event so we import the measure
                        return this.addNewMeasureUntilLastState(previousMeasure.idCount,previousMeasure.from.type, previousMeasure.from.id, previousMeasure.from.handler, previousMeasure.to.type, previousMeasure.to.id, previousMeasure.to.handler, previousMeasure.cachedFinalPosition)
                    // }
                // }
                break;
            }
        }


        return []
    }

    addNewMeasureUntilLastState(idCount,fromEntityType, fromId, fromHandlerName, toEntityType, toId, toHandlerName, cachedFinalPosition) {
        let result = []

        //TODO what about deleted measures?
        if (idCount && this.measureFor(idCount)) {
            return []
        }

        let newMeasure = new MeasureModel(this, { type: fromEntityType, id: fromId, handler: fromHandlerName }, { type: toEntityType, id: toId, handler: toHandlerName }, cachedFinalPosition)
        if (!idCount) {
            idCount = globalStore.measureCounter++;
        }
        newMeasure.idCount = idCount;
        result.push(newMeasure)
        this.measures.push(newMeasure);console.log("ADDED MEASURE " + newMeasure.id)
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
        console.log("SEARCHING FOR MEASURE WITH ID = " + measureId)
        return this.measures.find(aMeasure => aMeasure.id === measureId)
    }
    touchFor(touchId) {
        if (this.currentInputEvent) {
            return this.currentInputEvent.touchFor(touchId)
        }
        return undefined
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
            logger("Equal values, this shape should keep or start following the master")
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
        let wasMasterShape = aShapeModel.masterVersion === undefined
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

        if (wasMasterShape) {
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
    constructor({ type: type, touches: touches, changedTouches: changedTouches, timeStamp: timeStamp }) {
        this.type = type
        this.touches = []
        this.changedTouches = []
        //We need to keep the old "for var i" iteration because touches in iOS are not iterable, they are a dictionary with numerical keys
        for (let i=0; i < touches.length; i++) {
            let eachTouchObject = touches[i]
            this.touches.push(new InputEventTouch(eachTouchObject))
        }
        for (let i=0; i < changedTouches.length; i++) {
            let eachTouchObject = changedTouches[i]
            this.changedTouches.push(new InputEventTouch(eachTouchObject))
        }
        this.timeStamp = timeStamp
        this.testShapes = []
    }
    deleteYourself() {
        for (aTestShape of Array.from(this.testShapes)) {
            aTestShape.prepareForDeletion()
            this.testShapes.remove(aTestShape)
        }
    }
    get leanJSON() {
        //Removing testShapes from the inputEvent
        return {type: this.type, touches: this.touches.map(x => x.leanJSON), changedTouches: this.changedTouches.map(x => x.leanJSON), timeStamp: this.timeStamp }
    }
    touchFor(touchId) {
        return this.touches.find(aTouch => aTouch.id == touchId)
    }
}

class InputEventTouch {
    constructor({identifier:identifier,x:x,y:y,pageX:pageX,pageY:pageY,radiusX:radiusX,radiusY:radiusY,angularRotation:angularRotation,force:force}) {
        this.identifier = identifier;
        this.id = 'T'+identifier
        this.name = this.id
        this.position = new Position(x || pageX, y || pageY)

        this.size = new Size(radiusX,radiusY)
        this.angularRotation = angularRotation
        this.force = force
        this.highlight = false
    }

    get x() {
        return this.position.x
    }
    get y() {
        return this.position.y
    }

    set x(value) {
        return this.position.x = value
    }
    set y(value) {
        return this.position.y = value
    }

    get radiusX() {
        return this.size.width
    }
    get radiusY() {
        return this.size.height
    }

    propertyMap() {
        return {"position":["x","y"],"size":["width","height"],"force":[],"angularRotation":[]}
    }

    get allProperties() {
        return Object.keys(this.propertyMap())
    }

    get proxy() {
        return new Proxy(this,{
            ownKeys(target) {
                return target.allProperties
            },
            getPrototypeOf(target) {
                return null
            },
            get(target,key) {
                return target[key]
            }
        })
    }

    get leanJSON() {
        // console.log("InputEventTouch >> " + JSON.stringify({identifier: this.identifier,x: this.x, y: this.y, radiusX: this.radiusX, radiusY: this.radiusY, angularRotation: this.angularRotation, force: this.force }))
        //TODO check why angularRotation is not appearing, apparently when a value it is undefined cannot be added to the final JSON
        return {identifier: this.identifier, x: this.x, y: this.y, radiusX: this.radiusX, radiusY: this.radiusY, angularRotation: this.angularRotation, force: this.force }
    }
    positionOfHandler(handlerName) {
        if (handlerName == 'center') {
            return this.position
        } else {
            console.log("Unrecognized handlerName in InputEventTouch: " + handlerName)
        }
    }
    get deltaX() {
        debugger;
        return this.radiusX * 2
    }
    get deltaY() {
        debugger;
        return this.radiusY * 2
    }
    diffArray(comparingTouch) {
        let changes = []

        if (this.x != comparingTouch.x || this.y != comparingTouch.y) {
            changes.push({id: this.id, name: this.name, type: 'touch', property: { name: "position" , before: { x: this.x, y: this.y }, after: { x: comparingTouch.x, y: comparingTouch.y } } })
        }
        if (this.radiusX != comparingTouch.radiusX || this.radiusY != comparingTouch.radiusY) {
            changes.push({id: this.id, name: this.name, type: 'touch', property: { name: "size" , before: { width: this.radiusX, height: this.radiusY }, after: { width: comparingTouch.radiusX, height: comparingTouch.radiusY } } })
        }
        return changes
    }
    valueForProperty(propertyName) {
        switch (propertyName) {
            case 'position': {
                return this.position
            }
            case 'size': {
                return this.size
            }
            default: {
                console.log("InputEventTouch >> valueForProperty, Unrecognized property name: " + propertyName)
            }
        }
    }
}

class Property {
    constructor() {

    }
    basicApplyDelta(input,min,max,ratio,xProperty=undefined,yProperty=undefined) {
        //'this' is the output
        let deltaValue = input.delta()
        let deltaX
        let deltaY

        if (typeof deltaValue == "number") {
            if (xProperty && yProperty) {
                //the delta is unidimensional and I need to apply to a 2D value
                abort()
                return
            }
            deltaX = deltaValue
            deltaY = deltaValue
        } else {
            let {x:dx,y:dy} = deltaValue

            deltaX = dx
            deltaY = dy
        }

        if (deltaX == undefined && deltaY == undefined) {
            console.log("Property >> applyDelta")
            abort()
            return
        }

        let ratioX = 1
        let ratioY = 1
        if (typeof ratio == "number") {
            ratioX = ratioY = ratio
        } else {
            let {x:ratioX,y:ratioY} = ratio
        }

        let maxX = Number.POSITIVE_INFINITY
        let maxY = Number.POSITIVE_INFINITY
        if (typeof max == "number") {
            maxX = maxY = max
        } else {
            let {x:maxX,y:maxY} = max
        }

        let minX = Number.NEGATIVE_INFINITY
        let minY = Number.NEGATIVE_INFINITY
        if (typeof min == "number") {
            minX = minY = min
        } else {
            let {x:minX,y:minY} = min
        }

        if (xProperty) {
            this[xProperty] = Math.max(Math.min(this[xProperty] + deltaX * ratioX, maxX), minX)
        }
        if (yProperty) {
            this[yProperty] = Math.max(Math.min(this[yProperty] + deltaY * ratioY, maxY), minY)
        }
    }
}

class Position extends Property {
    constructor(x,y,previousX,previousY) {
        super()

        // if (Number.isNaN(x) || Number.isNaN(y)) {
        //     debugger;
        // }

        this._x = x
        this._y = y
        this.previousX = previousX == undefined || Number.isNaN(previousX)?x:previousX
        this.previousY = previousY == undefined || Number.isNaN(previousY)?y:previousY
    }
    get x(){
        let algo = this._x

        if (!algo) {
            return algo
        }

        return {
          [Symbol.toPrimitive](hint) {
            return algo;
          },
          valueOf: () => algo,
          toString: () => "" + algo,
          toJSON: () => algo,
          applyDelta: (input,min,max,ratio) => {
            this.basicApplyDelta(input,min,max,ratio,"x",undefined)
          },
          delta: () => this.x - this.previousX
        }

    }
    set x(value) {
        if (value && !Number.isNaN(value)) {
            value = Math.round(value)
        }

        this.previousX = !Number.isNaN(this._x)?this._x:value
        this._x = value
    }
    get y(){
        let algo = this._y

        if (!algo) {
            return algo
        }

        return {
          [Symbol.toPrimitive](hint) {
            return algo;
          },
          valueOf: () => algo,
          toString: () => "" + algo,
          toJSON: () => algo,
          applyDelta: (input,min,max,ratio) => {
             this.basicApplyDelta(input,min,max,ratio,undefined,"y")
          },
          delta: () => this.y - this.previousY
        }
    }
    set y(value) {
        if (value && !Number.isNaN(value)) {
            value = Math.round(value)
        }
        this.previousY = !Number.isNaN(this._y)?this._y:value
        this._y = value
    }
    get previous() {
        return {x: this.previousX,y:this.previousY}
    }

    applyDelta(input,min,max,ratio) {
        this.basicApplyDelta(input,min,max,ratio,"x","y")
    }

    delta() {
        return {x:this.x - this.previousX,y:this.y-this.previousY}
    }

    shifted(xShift,yShift) {
        return new Position(this.x + xShift,this.y + yShift,this.previousX + xShift,this.previousY + yShift)
    }

    toJSON() {
        return {x:this.x,y:this.y}
    }
}

class Size extends Property {
    constructor(width,height,previousWidth,previousHeight) {
        super()

        // if (width == NaN || height == NaN) {
        //     debugger;
        // }

        this._width = width
        this._height = height
        this.previousWidth = previousWidth == undefined || Number.isNaN(previousWidth)?width:previousWidth
        this.previousHeight = previousHeight == undefined || Number.isNaN(previousHeight)?height:previousHeight
    }

    get width(){
        let algo = this._width

        if (!algo) {
            return algo
        }

        return {
          [Symbol.toPrimitive](hint) {
            return algo;
          },
          valueOf: () => algo,
          toString: () => "" + algo,
          toJSON: () => algo,
          applyDelta: (input,min,max,ratio) => {
            this.basicApplyDelta(input,min,max,ratio,"width",undefined)
          },
          delta: () => this.width - this.previousWidth
        }
    }

    set width(value) {
        if (value && !Number.isNaN(value)) {
            if (value < 0) {
                value = 0
            } else {
                value = Math.round(value)
            }
        }
        this.previousWidth = !Number.isNaN(this._width)?this._width:value
        this._width = value
    }

    get height(){
        let algo = this._height

        if (!algo) {
            return algo
        }

        return {
          [Symbol.toPrimitive](hint) {
            return algo;
          },
          valueOf: () => algo,
          toString: () => "" + algo,
          toJSON: () => algo,
          applyDelta: (input,min,max,ratio) => {
            this.basicApplyDelta(input,min,max,ratio,undefined,"height")
          },
          delta: () => this.height - this.previousHeight
        }
    }

    set height(value) {
        if (value && !Number.isNaN(value)) {
            if (value < 0) {
                value = 0
            } else {
                value = Math.round(value)
            }
        }
        this.previousHeight = !Number.isNaN(this._height)?this._height:value
        this._height = value
    }

    applyDelta(input,min,max,ratio) {
        this.basicApplyDelta(input,min,max,ratio,"width","height")
    }

    delta() {
        return {x:this.width - this.previousWidth,y:this.height-this.previousHeight}
    }

    toJSON() {
        return {width:this.x,height:this.height}
    }
}

class Distance extends Property {
    static dist(p1,p2) {
        return Math.sqrt( Math.pow(p1.x-p2.x,2) + Math.pow(p1.y-p2.y,2))
    }

    [Symbol.toPrimitive](hint) {
        return this.value;
    }

    valueOf() {
        return this.value
    }

    toString() {
        return "" + this.value
    }

    toJSON() {
        return this.value
    }

    constructor(initialPoint,finalPoint) {
        super()
        this.initialPoint = initialPoint
        this.finalPoint = finalPoint
    }

    get value() {
        return Distance.dist(this.initialPoint,this.finalPoint)
    }

    delta() {
        let previousDistance = Distance.dist(this.initialPoint.previous,this.finalPoint.previous)
        return this.value - previousDistance
    }

    get distanceX() {
        let algo = this.initialPoint.x - this.finalPoint.x

        return {
          [Symbol.toPrimitive](hint) {
            return algo;
          },
          valueOf: () => algo,
          toString: () => "" + algo,
          toJSON: () => algo,
          delta: () => algo - (this.initialPoint.previous.x - this.finalPoint.previous.x)
        }
    }

    get distanceY() {
        let algo = this.initialPoint.y - this.finalPoint.y

        return {
          [Symbol.toPrimitive](hint) {
            return algo;
          },
          valueOf: () => algo,
          toString: () => "" + algo,
          toJSON: () => algo,
          delta: () => algo - (this.initialPoint.previous.y - this.finalPoint.previous.y)
        }
    }
}

class ShapeModel {
    constructor(id, aMasterVersion, aColor = '', left = null, top = null, width = null, height = null, cornerRadius = '') {
        this.id = id;
        this.name = id;

        this.opacity = 1

        if (aMasterVersion) {
            this.cornerRadius = aMasterVersion.cornerRadius;
        } else {
            this.cornerRadius = cornerRadius;
        }

        this._color = aColor
        // this._position = {
        //     x: left,
        //     y: top
        // };
        this._position = new Position(left,top)
        // this._size = {
        //     width: width,
        //     height: height
        // };
        this._size = new Size(width,height)
        this.masterVersion = aMasterVersion;
        this.highlight = false
        this.isSelected = false
        this.isResizing = false
        this.isMoving = false
    }

    snapVertexPosition(plainPosition) {
        //Empty implementation
    }

    snap(positionProperty,plainSize) {
        //Empty implementation
    }

    propertyMap() {
        return {"position":["x","y"],"size":["width","height"],"color":[]}
    }

    get allProperties() {
        return Object.keys(this.propertyMap())
    }

    get proxy() {
        return new Proxy(this,{
            ownKeys(target) {
                return target.allProperties.concat(["create","destroy"])
            },
            getPrototypeOf(target) {
                return null
            },
            get(target,key) {
                if (key == "create") {
                    let timestamp = (new Date()).getTime()
                    return globalStore.mobileCanvasVM.createShapeVM(target.id+'-'+timestamp,target.toJSON())
                }
                if (key == "destroy") {
                    return globalStore.mobileCanvasVM.deleteShapeVM(target.id)
                }
                if (target.isVertexProperty(key)) {
                    return target.vertexFor(key)
                }
                return target[key]
            }
        })
    }

    isVertexProperty(prop) {
        return false
    }

    get isMaster() {
        return this.masterVersion === undefined
    }

    sendToMobile(messageType="NEW_SHAPE",properties) {
        if (this.isMaster) {
            globalStore.socket.emit('message-from-desktop', { type: messageType, id: this.id, message: this.toJSON(properties) })
        }
    }

    static createShape(shapeType,shapeId,protoShape) {
        if (!shapeId) {
            console.log("ShapeModel class >> createShape, I'm pretty sure that shapeId needs to be defined")
        }
        let myColor = globalStore.toolbarState.currentColor;
        switch (shapeType) {
            case 'rectangle': {
                if (protoShape) {
                    return new RectangleModel(shapeId, protoShape)
                }
                return new RectangleModel(shapeId, protoShape, myColor, NaN, NaN, NaN, NaN)
            }
            case 'circle': {
                if (protoShape) {
                    return new RectangleModel(shapeId, protoShape)
                }
                return new RectangleModel(shapeId, protoShape, myColor, NaN, NaN, NaN, NaN, '50%')
            }
            case 'polygon': {
                if (protoShape) {
                    return new PolygonModel(shapeId, protoShape)
                }
                // return new PolygonModel(shapeId, protoShape, '#ffffff', NaN, NaN, NaN, NaN)
                return new PolygonModel(shapeId, protoShape, myColor, 0, 0, 0, 0)
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
            'border:' + ('1px') + ' solid #cccccc' + ";" +
            'overflow:' + 'visible' + ";" +
            'border-radius:' + this.cornerRadius + ";" +
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
        return this.size.width
    }
    get height() {
        return this.size.height
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
        this._size.width = value;
    }
    set height(value) {
        this._size.height = value;
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
                this._size.width = null;
                this._size.height = null;
                break;
        }
    }
    setOwnPropertiesFromMaster(property) {
        switch (property) {
            case 'color': {
                this.color = this.valueForProperty("color")
                break;
            }
            case 'position': {
                this.left = this.valueForProperty("left")
                this.top = this.valueForProperty("top")
                break;
            }
            case 'size':{
                this.width = this.valueForProperty("width")
                this.height = this.valueForProperty("height")
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
                this.left = changedValue.x.valueOf()
                this.top = changedValue.y.valueOf()
                break;
            }
            case 'size': {
                this.width = changedValue.width.valueOf()
                this.height = changedValue.height.valueOf()
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
                return this._size.width == null && this._size.height == null;
            }
        }
        // "check all properties" //TODO what about vertices???
        return this.isFollowingMaster('color') && this.isFollowingMaster('position') && this.isFollowingMaster('size')
    }
    valueForProperty(property) {
        let value = this[property]
        if (value) {
            return value.valueOf()
        }
        return value
    }
    areEqualValues(property, value1, value2) {
        switch (property) {
            case 'color':{
                return value1 == value2;
            }
            case 'position':{
                if (value1.x == null || value1.x == undefined || Number.isNaN(value1.x) || value1.y == null || value1.y == undefined || Number.isNaN(value1.y)) {
                    debugger;
                }
                if (value2.x == null || value2.x == undefined || Number.isNaN(value2.x) || value2.y == null || value2.y == undefined || Number.isNaN(value2.y)) {
                    debugger;
                }
                return value1.x.valueOf() == value2.x.valueOf() && value1.y.valueOf() == value2.y.valueOf();
            }
            case 'size':{
                if (value1.width == null || value1.width == undefined || Number.isNaN(value1.width) || value1.height == null || value1.height == undefined || Number.isNaN(value1.height)) {
                    debugger;
                }
                if (value2.width == null || value2.width == undefined || Number.isNaN(value2.width) || value2.height == null || value2.height == undefined || Number.isNaN(value2.height)) {
                    debugger;
                }
                return value1.width.valueOf() == value2.width.valueOf() && value1.height.valueOf() == value2.height.valueOf();
                // return value1.width.valueOf() == value2.width.valueOf() && value1.height.valueOf() == value2.height.valueOf();
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
                return this.position.shifted(this.width,0)
            }
            case 'northWest':{
                return this.position.shifted(0,0)
            }
            case 'southWest':{
                return this.position.shifted(0,this.height)
            }
            case 'southEast':{
                return this.position.shifted(this.width,this.height)
            }
            case 'middleRight':{
                return this.position.shifted(this.width,this.height / 2)
            }
            case 'middleLeft':{
                return this.position.shifted(0,this.height / 2)
            }
            case 'middleTop':{
                return this.position.shifted(this.width / 2,0)
            }
            case 'middleBottom':{
                return this.position.shifted(this.width / 2,this.height)
            }
            case 'center':{
                return this.position.shifted(this.width / 2,this.height / 2)
            }
        }
        console.log("WERIDDDDDDDDDD")
    }
    deselect() {
        this.isSelected = false
    }

    create() {
        globalBus.$emit("TEMPLATE_CREATE",this)
    }

    delete() {
        globalBus.$emit("TEMPLATE_DELETE",this)
    }
}

class RectangleModel extends ShapeModel {
    constructor(id, aMasterVersion, aColor = '', left = null, top = null, width = null, height = null, cornerRadius = '') {
        super(id, aMasterVersion, aColor, left, top, width, height, cornerRadius)
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

    toJSON(props=['color','top','left','width','height']) {
        let json = {}
        for (let eachKey of ['id','type','opacity','cornerRadius'].concat(props)) {
            json[eachKey] = this[eachKey].valueOf()
        }
        return json
    }

    fromJSON(json) {
        //     this.id = json.id
        //     this.type = json.type
        for (let eachKey of ['color','top','left','width','height','opacity','cornerRadius']) {
            if (json.hasOwnProperty(eachKey)) {
                if (this.valueForProperty(eachKey) != json[eachKey]) {
                    // console.log("RectangleModel >> fromJSON, NOT ignoring " + eachKey + " " + json[eachKey])
                    this[eachKey] = json[eachKey]
                }// else {
                    // console.log("RectangleModel >> fromJSON, ignoring " + eachKey + " " + json[eachKey])
                // }
            }
        }
    }

    snap(positionProperty,plainSize) {
        let result = false
        //this is the testShape
        if (Math.abs(this.position.x - positionProperty.x) < 5 && Math.abs(this.position.y - positionProperty.y) < 5) {
            positionProperty.x = this.position.x.valueOf()
            positionProperty.y = this.position.y.valueOf()
            result = true
        }
        if (result && Math.abs(this.size.width - plainSize.width) < 5 && Math.abs(this.size.height - plainSize.height) < 5) {
            plainSize.width = this.size.width.valueOf()
            plainSize.height = this.size.height.valueOf()
            result = true
        }
        return result
    }
}

class PolygonModel extends ShapeModel {
    constructor(id, aMasterVersion, aColor = '', left = null, top = null, width = null, height = null) {
        super(id, aMasterVersion, aColor, left, top, width, height)
        this._vertices = {}
        if (aMasterVersion) {
            for (let i=0;i<aMasterVersion.amountOfVertices;i++) {
                Vue.set(this._vertices,"V"+i,undefined)
            }
        }
        // this.relevantPoints = [new RelevantPoint(this, 'northWest', 0, 0), new RelevantPoint(this, 'northEast', 1, 0), new RelevantPoint(this, 'southEast', 1, 1), new RelevantPoint(this, 'southWest', 0, 1), new RelevantPoint(this, 'middleRight', 1, 0.5), new RelevantPoint(this, 'middleLeft', 0, 0.5), new RelevantPoint(this, 'middleTop', 0.5, 0), new RelevantPoint(this, 'middleBottom', 0.5, 1), new RelevantPoint(this, 'center', 0.5, 0.5)];
    }

    // Defined in the superclass, I couldn't figure out how to do inheritance of getters/setters
    // get proxy() {
    // }

    snapVertexPosition(plainPositionObject) {
        for (let eachVertex of Object.values(this.vertices)) {
            if (Math.abs(plainPositionObject.x - eachVertex.x) < 5 && Math.abs(plainPositionObject.y - eachVertex.y) < 5) {
                plainPositionObject.x = eachVertex.x.valueOf()
                plainPositionObject.y = eachVertex.y.valueOf()
                return
            }
        }
    }

    prepareForDeletion() {
        for (let vertex of Object.values(this._vertices)) {
            vertex.prepareForDeletion()
        }
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
        for (let i of this.vertexNames) {
            if (!nextShapeWithTheSameModel.isFollowingMaster(i) && !this.areEqualValues(i, this.vertexFor(i), nextShapeWithTheSameModel.vertexFor(i))) {
                changes.push({ id: this.id, name: this.name, type: 'shape', property:{ name: "vertex", before: this.vertexFor(i), after: nextShapeWithTheSameModel.vertexFor(i) } })
            }
        }

        return changes
    }
    get vertexNames() {
        return [...Array(this.amountOfVertices).keys()].map((i) => "V"+i)
    }
    get vertices() {
        let result = {}
        for (let vertexKey of this.vertexNames) {
            result[vertexKey] = this.vertexFor(vertexKey)
        }
        return result
    }
    get amountOfVertices() {
        // return this._vertices.length
        return Object.keys(this._vertices).length;
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
    addVertex(canvasPosition,vertexId=undefined) {
        if (!vertexId) {
            vertexId = "V"+this.amountOfVertices
        }
        let newVertex = new Vertex(this,vertexId,canvasPosition)
        Vue.set(this._vertices,vertexId,newVertex)
        Vue.set(this,vertexId,newVertex)
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
        // return !isNaN(propertyName)
        return /V\d+/.test(propertyName);
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
            Vue.set(this._vertices,property,new Vertex(this,property,this.vertexFor(property)))
            // this._vertices[property] = new Vertex(this,this.vertexFor(property))
        } else {
            super.setOwnPropertiesFromMaster(property)
        }
    }

    propertyMap() {
        let newPropertyMap = super.propertyMap()
        for (let key in this.vertices) {
            newPropertyMap[key] = {"position":["x","y"]}
        }
        return newPropertyMap
    }

    // get allProperties() {
    //     let previousProperties = [...super.allProperties]
    //     for (let i=0;i<this.amountOfVertices;i++) {
    //         previousProperties.push("V"+i)
    //     }
    //     return previousProperties
    // }
    isFollowingMaster(property) {
        if (this.isVertexProperty(property)) {
            return this._vertices[property] == undefined
        }
        return super.isFollowingMaster(property)
    }
    changeOwnProperty(changedPropertyName,changedValue) {
        if (this.isVertexProperty(changedPropertyName)) {
            //It's a vertex
            let correspondingVertex = this._vertices[changedPropertyName]
            if (!correspondingVertex) {
                // Vue.set(target,key,value)
                Vue.set(this._vertices,changedPropertyName,new Vertex(this,changedPropertyName,changedValue))
            } else {
                correspondingVertex.x = changedValue.x
                correspondingVertex.y = changedValue.y
            }
        } else {
            super.changeOwnProperty(changedPropertyName,changedValue)

            if (changedPropertyName == "position") {
                //If we change position, let's create our own vertices
                for (let vertexName of this.vertexNames) {
                    if (this.isFollowingMaster(vertexName)) {
                        let protoVertex = this.vertexFor(vertexName)
                        Vue.set(this._vertices,vertexName,new Vertex(this,vertexName,{x:protoVertex.relativeX,y:protoVertex.relativeY}))
                    }
                }
            }
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
            return value1.x.valueOf() == value2.x.valueOf() && value1.y.valueOf() == value2.y.valueOf()
        } else {
            return super.areEqualValues(property, value1, value2)
        }
    }
    toJSON(properties = ['color','position','vertices']) {
        let json = {id:this.id,type:this.type}

        if (properties.includes('color')) {
            json.color = this.color
        }

        if (properties.includes('position')) {
            json.position = {x:this.position.x,y:this.position.y}
        }

        if (properties.includes('vertices')) {
            json.vertices = {}
            for (let eachVertexKey in this.vertices) {
                let eachVertex = this.vertices[eachVertexKey]
                json.vertices[eachVertexKey] = eachVertex.toJSON()
            }
        }

        return json
    }
    fromJSON(json) {
            // this.id = json.id
            // this.type = json.type
        if (json.color) {
            if (!this.areEqualValues("color",this.color,json.color)) {
                this.changeOwnProperty("color",json.color)
            }
        }
        if (json.position) {
            if (!this.areEqualValues("position",this.position,json.position)) {
                this.changeOwnProperty("position",json.position)
            }
        }
        if (json.vertices) {
            for (let vertexKey in json.vertices) {
                let eachJSONVertex = json.vertices[vertexKey]
                let shouldCreate = false
                let vertex = this.vertexFor(eachJSONVertex.id)

                if (!vertex) {
                    shouldCreate = true
                }

                if (!shouldCreate && !this.areEqualValues(vertexKey,vertex,eachJSONVertex)) {
                    let vertex = this._vertices[vertexKey]
                    //Do i actually has the vertex or was I following master?
                    if (vertex) {
                        //I actually has a vertex
                        vertex.x = eachJSONVertex.x
                        vertex.y = eachJSONVertex.y
                    } else {
                        shouldCreate = true
                    }
                }

                if (shouldCreate) {
                    this.addVertex(eachJSONVertex,eachJSONVertex.id)
                    // Vue.set(this._vertices,eachJSONVertex.id,new Vertex(eachJSONVertex.id,eachJSONVertex))
                }

            }
        }
    }

    positionOfHandler(handlerName) {
        let vertex = this.vertexFor(handlerName)
        if (vertex) {
            return {x: vertex.x, y: vertex.y}
        }
        return undefined
    }
}

class Vertex {
    constructor(polygon,id,{x:canvasX,y:canvasY}) {
        this.polygon = polygon
        this.id = id
        this.position = new Position(canvasX,canvasY)
        this.highlight = false
    }
    get relativeX() {
        return this.position.x.valueOf()
    }
    get relativeY() {
        return this.position.y.valueOf()
    }
    get x() {
        return this.position.x + this.polygon.left
    }
    set x(value) {
        this.position.x = value - this.polygon.left
    }
    get y() {
        return this.position.y + this.polygon.top
    }
    set y(value) {
        this.position.y = value - this.polygon.top
    }
    top(aShape) {
        return this.y
    }
    left(aShape) {
        return this.x
    }
    get namePrefix() {
        return this.id
    }
    toJSON() {
        return {id:this.id,x:this.x,y:this.y}
    }
    prepareForDeletion() {
        this.polygon = undefined
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

class State {
    constructor(machine,{id,name,description,isSelected,isActive,x,y,enter,exit}) {
        this.machine = machine;

        this.id = id;
        this._name = name;
        this._description = description || '';
        this._isSelected = isSelected || false;
        this.isActive = isActive || false;
        this.x = x || 0;
        this.y = y || 0;
        this.enter = enter || function(e) { /* This function is executed when we enter this state */ };
        this.exit = exit || function(e) { /* This function is executed when we leave this state */ };
        this.isReadyToServe = false
    }

    get relevantTransitions() {
        return this.machine.transitions.filter(t => t.source == this || t.target == this)
    }

    deleteYourself() {
        //Let's find all the transitions coming out or in this state
        for (let transition of Array.from(this.relevantTransitions)) {
            transition.deleteYourself()
        }

        this.machine.states.remove(this);
        if (this.machine.isServer) {
            globalStore.socket.emit('message-from-desktop', { type: "MACHINE_DELETED_STATE", id: this.id });
        }
        this.machine = undefined;
    }

    get actions() {
        return this.machine.actions;
    }

    get objects() {
        return this.machine.objects;
    }

    get name() {
        return this._name;
    }
    set name(value) {
        this._name = value
        this.machine.notifyChange("STATE",this,"name");
    }

    get description() {
        return this._description;
    }
    set description(value) {
        this._description = value
        this.machine.notifyChange("STATE",this,"description");
    }

    get isSelected() {
        return this._isSelected;
    }
    set isSelected(value) {
        this._isSelected = value
        this.machine.notifyChange("STATE",this,"isSelected");
    }

    get isActive() {
        return this._isActive;
    }
    set isActive(value) {
        this._isActive = value
        // this.machine.notifyChange("STATE",this,"isActive");
    }

    get enter() {
        return this._enter;
    }
    set enter(value) {
        this._enter = value
        this.machine.notifyChange("STATE",this,"enter");
    }

    get exit() {
        return this._exit;
    }
    set exit(value) {
        this._exit = value
        this.machine.notifyChange("STATE",this,"exit");
    }

    toJSONString(properties=undefined) {
        let enterFn = eval(JSONfn.stringify(this.enter))
        let exitFn = eval(JSONfn.stringify(this.exit))

        if (!properties) {
            properties = ['id','description','name','isSelected','isActive','x','y','enter','exit']
        }
        let result = "{\n"
        for (let eachProperty of properties) {
            let value = this[eachProperty]
            if (eachProperty == "enter" || eachProperty == "exit") {
                value = eval(JSONfn.stringify(value))
            } else {
                if (typeof value == "string") {
                    value = "\'" + value + "\'"
                }
            }
            result += `\t${eachProperty}: ${value},\n`
        }
        return result+"\n}"
    }

    fromJSON(actualValues) {
        for (let eachKey in actualValues) {
            if (eachKey == "id") {
                if (this.id) {
                    //If I have an id I should not change it
                    continue;
                }
            }
            this[eachKey] = actualValues[eachKey]
        }
    }

    get code() {
        let enterFn = eval(JSONfn.stringify(this.enter))
        let exitFn = eval(JSONfn.stringify(this.exit))

        return `{
        description: '${this.description}',
        name: '${this.name}',
        enter: ${enterFn},
        exit: ${exitFn}
}`;
    }

    set code(newCode) {
        try {
            let actualValues

            eval("actualValues = "+newCode);

            for (let eachKey of ["description","name","enter","exit"]) {
                this[eachKey] = actualValues[eachKey]
            }
        } catch (e) {
            if (e instanceof SyntaxError) {
                console.log("SyntaxError in State >> set code, ignoring until the code is fixed")
            }
        }
    }
}

class Transition {
    constructor(machine,{id,name,description,source,target,isSelected,isActive,guard,action}) {
        this.machine = machine;

        this.id = id;
        this._name = name;
        this._description = description || '';
        this.source = typeof source === "string" ? this.machine.findStateId(source) : source;
        this.target = typeof target === "string" ? this.machine.findStateId(target) : target;
        this._isSelected = isSelected || false;
        this._isActive = isActive || false;
        this._guard = guard || function(e) {
// Only when the guard is true the transition is executed
return true;
};
        this._action = action || function(e) {
// When the transition is executed this action is performed
};

        this.isReadyToServe = false;

        this.isActiveTimer = undefined
    }

    deleteYourself() {
        this.machine.transitions.remove(this);
        if (this.machine.isServer) {
            globalStore.socket.emit('message-from-desktop', { type: "MACHINE_DELETED_TRANSITION", id: this.id });
        }
        this.machine = undefined;
    }

    get functions() {
        return this.machine.functions
    }
    get objects() {
        return this.machine.objects;
    }

    get name() {
        return this._name;
    }
    set name(value) {
        this._name = value
        this.machine.notifyChange("TRANSITION",this,"name");
    }

    get description() {
        return this._description;
    }
    set description(value) {
        this._description = value
        this.machine.notifyChange("TRANSITION",this,"description");
    }

    get isSelected() {
        return this._isSelected;
    }
    set isSelected(value) {
        this._isSelected = value
        this.machine.notifyChange("TRANSITION",this,"isSelected");
    }

    get isActive() {
        return this._isActive;
    }
    set isActive(value) {
        this._isActive = value
        clearTimeout(this.isActiveTimer);
        this.isActiveTimer = setTimeout(() => this._isActive = false, 200)
        // this.machine.notifyChange("TRANSITION",this,"isActive");
    }

    get guard() {
        return this._guard;
    }
    set guard(value) {
        this._guard = value
        this.machine.notifyChange("TRANSITION",this,"guard");
    }

    get action() {
        return this._action;
    }
    set action(value) {
        this._action = value
        this.machine.notifyChange("TRANSITION",this,"action");
    }

    get code() {
        let guardFn = eval(JSONfn.stringify(this.guard))
        let actionFn = eval(JSONfn.stringify(this.action))

        return `{
        description: '${this.description}',
        name: '${this.name}',
        guard: ${guardFn},
        action: ${actionFn}
}`;
    }

    set code(newCode) {
        try {
            let actualValues

            eval("actualValues = "+newCode);

            for (let eachKey of ["description","name","guard","action"]) {
                this[eachKey] = actualValues[eachKey]
            }
        } catch (e) {
            if (e instanceof SyntaxError) {
                console.log("SyntaxError in Transition >> code, ignoring until the code is fixed")
            }
        }

    }
    toJSONString(properties=undefined) {
        if (!properties) {
            properties = ["id","description","name","source","target","guard","action","isSelected","isActive"]
        }

        let result = "{\n"
        let lastProperty = properties[properties.length - 1]
        for (let eachProperty of properties) {
            let value = this[eachProperty]
            if (eachProperty == "guard" || eachProperty == "action") {
                value = eval(JSONfn.stringify(value))
            } else {
                if (eachProperty == "source" || eachProperty == "target") {
                    value = value.id
                }
                if (typeof value == "string") {
                    value = "\'" + value + "\'"
                }
            }
            result += `\t${eachProperty}: ${value}${eachProperty==lastProperty?'':','}\n`
        }
        return result+"}"
    }
    fromJSON(json) {
        for (let eachKey in json) {
            if (eachKey == "id") {
                if (this.id) {
                    //If I have an id I should not change it
                    continue;
                }
            }
            this[eachKey] = json[eachKey]
        }
    }
}

class SMFunction {
    constructor({machine,name,id,code}) {
        if (!id) {
            id = globalStore.functionCounter
            globalStore.functionCounter += 1
        }

        this.id = id
        this.name = name
        this.func = undefined //It is coupled with the code property
        this.machine = machine
        this.isSelected = false

        if (code) {
            this.code = code
        }

        this.isReadyToServe = false
    }

    deleteYourself() {
        this.machine.functions.remove(this)
        if (this.machine.isServer) {
            globalStore.socket.emit('message-from-desktop', { type: "MACHINE_DELETED_FUNCTION", id: this.id });
        }
        this.machine = undefined;
    }

    get code() {
        return eval(JSONfn.stringify(this.func))
    }
    set code(newCode) {
        try {
            eval("this.func = "+newCode);
            let nameRegexResult = newCode.match(/^function\s(\w+)/)
            if (nameRegexResult) {
                this.name = nameRegexResult[1]
            }
            if (this.isReadyToServe && this.machine.isServer) {
                globalStore.socket.emit('message-from-desktop', { type: "EDIT_FUNCTION", message: this.toJSON() });
            }
        } catch (e) {
            if (e instanceof SyntaxError) {
                console.log("SyntaxError in SMFunction >> set code, ignoring until the code is fixed")
            }
        }
    }

    toJSON() {
        let result = {}
        for (let key of ["id","name","code"]) {
            result[key] = this[key]
        }
        return JSON.stringify(result)
    }

    fromJSON(json) {
        for (let key in json) {
            this[key] = json[key]
        }
    }
}

class SMFunctionIsInside extends SMFunction {
    constructor({machine}) {
        super({machine,name:"isInside"});
        this.code = `function isInside({touch, shape}) {
        return shape.left < touch.x && shape.top < touch.y && shape.left + shape.width > touch.x && shape.top + shape.height > touch.y;
}`
    }
}

class SMFunctionMap extends SMFunction {
    constructor({machine}) {
        super({machine,name:"map"});
        this.code = `function map({input,
              output,
              min = Number.NEGATIVE_INFINITY,
              max = Number.POSITIVE_INFINITY,
              ratio = 1}) {
        output.applyDelta(input,min,max,ratio)
}`
    }
}

class StateMachine {
    constructor({isServer}) {
        this.states = []
        this.transitions = []
        this.functions = []

        this.event = undefined; //This is the event that we are currently processing
        this._currentState = undefined;
        this.firstState = undefined;

        this.isServer = isServer
        // this.hardcodedValues = {}

        let self = this;
        this.globalScope = new Proxy({}, {
            ownKeys(target) {
                let allKeys = []

                if (isServer) {
                    //We have actual visualStates
                    for (let eachVS of globalStore.visualStates) {
                        allKeys.push(eachVS.name)
                    }
                } else {
                    //We have hardcoded values
                    for (let visualStateId in globalStore.mobileCanvasVM.hardcodedValues) {
                        return visualStateId
                    }
                }

                for (let eachObject of self.accumulatedObjects) {
                    if (allKeys.indexOf(eachObject.name) < 0){
                        allKeys.push(eachObject.name)
                    }
                }

                for (let eachFunction of self.functions) {
                    allKeys.push(eachFunction.name)
                }

                return allKeys
            },
            getPrototypeOf(target) {
                return null
            },
            get (target, key) {
                if (isServer) {
                    let vs = globalStore.visualStates.find(vs => vs.name == key)
                    if (vs) {
                        return vs.proxy;
                    }
                } else {
                    let hardcodedValueIndexedByVisualStateId = globalStore.mobileCanvasVM.hardcodedValues[key]
                    if (hardcodedValueIndexedByVisualStateId) {
                        return hardcodedValueIndexedByVisualStateId
                    }
                }

                for (let eachObject of self.accumulatedObjects) {
                    if (eachObject.name == key) {
                        return eachObject.proxy
                    }
                }

                let foundFunction = self.functions.find(f => f.name == key)
                if (foundFunction) {
                    return foundFunction.func
                }

                return target[key]
            }
        });

        /***
    Utility functions to keep track of the touches.
    touchInfo[i] is an info record for the i-th finger being put down:
        The first finger is #0, the second #0, etc.
        When lifting fingers, the corresponding entries are cleared.
        When putting down a finger, the first free entry is used.
    The properties of the info record are:
        id: unique identifier (from touch object)
        index: finger number (i.e., index in touchInfo)
        first.x, first.y, first.t: position and time at touchdown
        prev.x, prev.y, prev.t: previous position and time
        cur.x, cur.y, cur.t: current position and time
    The application can add its own properties if needed

    The utility function manage the info records, and add a property 'info'
    to each event, holding the info record.
    **/

    this.touchId2Index = {}; // maps a touch identifier to an index in touchInfo
    this.touchInfo = [];     // stores touch information
    this.numTouches = 0;     // number of non-null entries in touchInfo
    this.firstIndex = -1;    // index of first non-null entry in touchInfo
    }

    initialize() {
        for (let newFunction of [new SMFunctionIsInside({machine:this}),new SMFunctionMap({machine:this})]) {
            this.addFunction(newFunction)
        }
        this.functions[0].isSelected = true;
    }

    toJSON() {
        let result = {}
        result.functions = []
        for (let fn of this.functions) {
            result.functions.push(fn.toJSON())
        }
        result.states = []
        for (let state of this.states) {
            result.states.push(state.toJSONString())
        }
        result.transitions = []
        for (let transition of this.transitions) {
            result.transitions.push(transition.toJSONString())
        }
        return result
    }

    fromJSON(json) {
        for (let array of [this.functions, this.states, this.transitions]) {
            array.forEach(each => each.prepareForDeletion())
            array.removeAll()
        }

        for (let fnString of json.functions) {
            let functionDescription = JSON.parse(fnString)
            this.updateFunction(functionDescription,true);
        }

        for (let stateString of json.states) {
            let stateDesc;
            eval(`stateDesc = ${stateString}`);
            this.insertNewState(stateDesc)
        }

        for (let transitionString of json.transitions) {
            let transitionDesc;
            eval(`transitionDesc = ${transitionString}`);
            this.insertNewTransition(transitionDesc)
        }
    }

    deleteYourself() {
        this.functions.concat(this.transitions).concat(this.states).forEach(each => {
            each.deleteYourself()
        })

        this.event = undefined;
        this.currentState = undefined;
        this.firstState = undefined;

        if (this.isServer) {
            globalStore.socket.emit('message-from-desktop', { type: "MACHINE_DELETED" });
        }
    }

    get currentState() {
        return this._currentState
    }

    set currentState(value) {
        this._currentState = value
        if (value) {
            globalStore.socket.emit('message-from-device', { type:"STATE_MACHINE_STATE", stateId: value.id });
        }
    }

    get accumulatedObjects() {
        if (!this.isServer) {
            return globalStore.mobileCanvasVM.allObjects
        }
        let accumulatedObjects = []
        for (let eachVS of globalStore.visualStates) {
            for (let eachObject of eachVS.allObjects) {
                accumulatedObjects.push(eachObject)
            }
        }
        return accumulatedObjects
    }

    get selectedElement() {
        let selectedFunction = this.functions.find(f => f.isSelected)
        if (selectedFunction) {
            return selectedFunction
        }
        let selectedNode = this.states.find(s => s.isSelected)
        if (selectedNode) {
            return selectedNode
        }
        let selectedTransition = this.transitions.find(s => s.isSelected)
        if (selectedTransition) {
            return selectedTransition
        }
        return undefined
    }

    sendToMobile(){
        //TODO We need to send the shapes, the measures, the touches and the functions (the functions should include the hardcoded values)
    }

    addMeasure(aMeasure) {
        // this.measures.push(aMeasure);

        if (this.isServer) {
            globalStore.socket.emit('message-from-desktop', { type: "NEW_MEASURE", message: aMeasure.toJSON() });
        }
    }

    addNewFunction(named) {
        let newSMFunction = new SMFunction({machine:this,name:named})
        newSMFunction.code = `function ${named}() {
  //Write your new function here
}`
        this.addFunction(newSMFunction)
        return newSMFunction
    }

    addFunction(aFunction) {
        this.functions.push(aFunction);

        if (this.isServer) {
            globalStore.socket.emit('message-from-desktop', { type: "NEW_FUNCTION", message: aFunction.toJSON() });
            aFunction.isReadyToServe = true;
        }
    }

    updateFunction(aFunctionJSON,shouldCreate=false) {
        let foundFunction = this.findFunctionId(aFunctionJSON.id)
        if (foundFunction) {
           foundFunction.fromJSON(aFunctionJSON)
        } else {
            if (shouldCreate) {
                aFunctionJSON.machine = this
                let newFunction = new SMFunction(aFunctionJSON);
                this.addFunction(newFunction)
            } else {
                console.log("Couldn't find function to update with id: " + aFunctionJSON.id)
            }
        }
    }

    insertNewState(stateDescription) {
        if (!stateDescription.id) {
            if (!this.isServer) {
                throw new 'we are creating new State ids outside the server'
            }
            stateDescription.id = ""+globalStore.stateCounter
            globalStore.stateCounter += 1
        }

        let newState = this.findStateId(stateDescription.id)
        if (newState) {
            //update
            newState.fromJSON(stateDescription)
        } else {
            //create
            newState = new State(this,stateDescription);
            this.states.push(newState);
        }

        if (!this.firstState) {
            this.firstState = newState;
        }
        if (!this.currentState) {
            this.currentState = this.firstState;
        }

        if (this.isServer) {
            globalStore.socket.emit('message-from-desktop', { type: "NEW_STATE", message:  newState.toJSONString() });
            newState.isReadyToServe = true;
        }

        return newState;
    }

    insertNewTransition(transitionDescription) {
        if (!transitionDescription.id) {
            if (!this.isServer) {
                throw new 'we are creating new Transitions ids outside the server'
            }
            transitionDescription.id = "" + globalStore.transitionCounter
            globalStore.transitionCounter += 1
        }

        let newTransition = this.findTransitionId(transitionDescription.id)
        if (newTransition) {
            //update
            newTransition.fromJSON(transitionDescription)
        } else {
            //create
            newTransition = new Transition(this,transitionDescription);
            this.transitions.push(newTransition);
        }

        if (this.isServer) {
            globalStore.socket.emit('message-from-desktop', { type: "NEW_TRANSITION", message:  newTransition.toJSONString() });
            newTransition.isReadyToServe = true;
        }

        return newTransition;
    }

    findTransitionsFrom(sourceState,transitionName) {
        return this.transitions.find(aTransition => aTransition.source == sourceState && aTransition.name == transitionName)
    }

    findStateId(stateId) {
        return this.states.find(aState => aState.id == stateId)
    }

    findTransitionId(transitionId){
        return this.transitions.find(aTransition => aTransition.id == transitionId)
    }

    findFunctionId(functionId) {
        return this.functions.find(f => f.id == functionId)
    }

    notifyChange(type,object,propertyName) {
        //type could be STATE or TRANSITION

        // let message = {id:object.id,propertyName:propertyName,value:object[propertyName]}
        if (object.isReadyToServe) {
            let message = object.toJSONString(["id",propertyName])
            globalStore.socket.emit('message-from-desktop', { type: "MACHINE_CHANGED_"+type, message: message });
        }
    }

    activateState(stateId,boolean=true) {
        for (let eachState of this.states) {
            if (eachState.id == stateId) {
                eachState.isActive = boolean
            } else {
                if (eachState.isActive) {
                    eachState.isActive = false
                }
            }
        }
    }

    activateTransition(transitionId,boolean=true) {
        let transition = this.findTransitionId(transitionId)
        transition.isActive = boolean
    }

    // A touch event contains one or more touches that have changed.
    // For example, when putting down two fingers at the same time, the event may contain two changed touches.
    // This function calls the bookkeeping functions above for each changed touches of a give event
    // and then passes the modified event to the state machine.
    processTouchEvent(type, event, preFn, postFn) {
        // console.log(">> processTouchEvent " + type + " - " + event.touches.length + " touches, " + event.changedTouches.length + " changed touches");
        event.preventDefault(); // avoid event bubbling
        // process each change
        // for (var i = 0; i < event.changedTouches.length; i++) {
            // console.log("  process touch #"+i);
            // event.touch = event.changedTouches.item(i); // add a shortcut to the touch being processed
            // let touchBeingProcessed = event.changedTouches[i];
            // console.log("  preFn ");
        if (preFn){
            // preFn(event, event.touch); // adds / modifies event.info
            preFn(event); // adds / modifies event.info
        }

        this.processEvent(type, globalStore.mobileCanvasVM.currentInputEvent);

        if (postFn) {
            // postFn(event, event.touch);
            postFn(event);
        }
    }

    // Find the first available slot in touchInfo, initialize the info record
    // and add it to the event
    recordTouchStart(event) {

            //hack
            globalStore.mobileCanvasVM.currentInputEvent = new InputEvent(event)
            globalStore.mobileCanvasVM.currentInputEvent.touches = []

        // console.log("-- recordTouchStart id "+touch.identifier);
        var index = 0;
        this.firstIndex = 0;


        for (let i=0;i<event.changedTouches.length;i++) {
            let touch = event.changedTouches[i];
            this.numTouches++;
            while (this.touchInfo[index])
                index++;
            // console.log("-- index="+index);

            this.touchId2Index[touch.identifier] = index;
            // this.touchInfo[index] = {
            //     id: touch.identifier,
            //     index: index,
            //     first: {x: touch.pageX, y: touch.pageY, t: event.timeStamp},
            //     prev: {x: touch.pageX, y: touch.pageY, t: event.timeStamp},
            //     cur: {x: touch.pageX, y: touch.pageY, t: event.timeStamp},
            // };

            let newTouch = new InputEventTouch(touch);
            this.touchInfo[index] = newTouch;
            globalStore.mobileCanvasVM.currentInputEvent.touches.push(newTouch)
        }

        // console.log("-- done");
    }

    // Update the info record and add it to the event
    recordTouchMove(event) {
        // console.log("-- recordTouchMove id "+touch.identifier);
        // console.log("-- index="+touchId2Index[touch.identifier]);

            //hack
            globalStore.mobileCanvasVM.currentInputEvent = new InputEvent(event)
            globalStore.mobileCanvasVM.currentInputEvent.touches = []

        for (let i=0;i<event.changedTouches.length;i++) {
            let touch = event.changedTouches[i];
            let myInputEventTouch = this.touchInfo[this.touchId2Index[touch.identifier]];
            myInputEventTouch.x = touch.pageX
            myInputEventTouch.y = touch.pageY
            globalStore.mobileCanvasVM.currentInputEvent.touches.push(myInputEventTouch)
        }
        // console.log("-- done");
    }

    // Add the info record to the event
    recordTouchEnd(event) {
        //hack
        globalStore.mobileCanvasVM.currentInputEvent = new InputEvent(event)
        globalStore.mobileCanvasVM.currentInputEvent.touches = []

        for (let i=0;i<event.changedTouches.length;i++) {
            let touch = event.changedTouches[i]
            let endedTouch = this.touchInfo[this.touchId2Index[touch.identifier]];
            globalStore.mobileCanvasVM.currentInputEvent.touches.push(endedTouch)
        }
    }

    // Remove the info record corresponding to a touch that is now gone
    clearTouch(event) {
        // console.log("-- clearTouch id "+touch.identifier);
        for (let i=0;i<event.changedTouches.length;i++) {
            let touch = event.changedTouches[i]
            var index = this.touchId2Index[touch.identifier];

            delete this.touchInfo[index];
            delete this.touchId2Index[touch.identifier];

            this.numTouches--;
            if (this.numTouches == 0)
                this.firstIndex = -1;
            else {
                this.firstIndex = 0;
                while (!this.touchInfo[this.firstIndex])
                    this.firstIndex++;
            }
        }

        // globalStore.mobileCanvasVM.currentInputEvent = new InputEvent(event)
        // console.log("-- done - numTouches = " + numTouches + ", firstindex = " + firstIndex);
    }

    processEvent(type, event) {
        var machine = this;
        var state = this.currentState;

        this.event = event

        if (!state) {
            return false;
        }

        var transition = this.findTransitionsFrom(state,type);
        //logSM('inprocessEvent '+type+' in state '+ state.name);
        if (! transition) {
            console.log('['+state.name+'] -- '+type+' -> NO transition');
            return false;
        }

        console.log('['+state.name+'] -- '+type+' -> transition');

        globalStore.socket.emit('message-from-device', { type:"STATE_MACHINE_STATE", transitionId: transition.id });

        return this.processTransition(state,event,transition,this);
    }

    // This function fires a transition, returning true if it did,
    // false otherwise (i.e. if a guard returned false or failed)
    processTransition(state,event,transition,machine) {
        // call the guard, if any
        if (transition.guard) {
            try {
                if (! transition.guard.call(machine, event, transition, state))
                    return false;
            } catch (e) {
                console.log("ignoring error in guard (skipping transition): "+e);
                return false;
            }
        }

        // call the exit action of the current state, if any
        var dest = transition.target;
        // console.log('['+state.name+'] -- '+type+' -> '+(dest? ('['+dest.name+']') : 'same state'));
        if (dest && state.exit)
            try {
                state.exit.call(machine, event, transition, state);
            } catch(e) {
                console.log("ignoring error in state exit action: "+e);
            }
        // call the transition action, if any
        if (transition.action) {
            try {
                transition.action.call(machine, event, transition, state);
            } catch(e) {
                console.log("ignoring error in transition action: "+e);
            }
        }

        // set the new current state and call the enter action of the destination state, if any
        if (dest) {
            machine.currentState = dest;
            if (dest.enter){
                try {
                    dest.enter.call(machine, event, transition, state);
                } catch(e) {
                    console.log("ignoring error in state enter action: "+e);
                }
            }
        }

        return true;
    }
    armTimeout(delay) {
        if (this._timer)
            this.cancelTimeout;
        var machine = this;
        this._timer = setTimeout(function() {
            machine.processEvent('timeout', null);
        }, delay);
    }
    cancelTimeout() {
        if (this._timer) {
            clearTimeout(this._timer);
            delete this._timer;
        }
    }
}