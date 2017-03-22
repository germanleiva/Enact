<template>
    <div class='box rule-placeholder' v-bind:class="ruleComplete()" :style="{ backgroundColor: activeColor}">
        <input class="condition input" v-on:mouseup="mouseUpFor($event,'mainCondition')" placeholder="Main Condition">
        <div class="leftSide" v-on:drop="dropForInput" v-on:dragover="dragOverForInput">
            <!--<div class="input" v-model="rulePlaceholderModel.input.id"></div>-->
            <div class="inputId button is-disabled">{{rulePlaceholderModel.input.name}}</div>
            <div class="iconAxis button" v-on:click="clickedOnAxis('input','axisX')" v-bind:class="{activeAxis:rulePlaceholderModel.input.axisX.isActive, inactiveAxis:!rulePlaceholderModel.input.axisX.isActive}"><i class='fa' v-bind:class="classAxisX(rulePlaceholderModel.input.property)"></i></div>
            <div class="iconAxis button" v-on:mouseup="clickedOnAxis('input','axisY')" v-bind:class="{activeAxis:rulePlaceholderModel.input.axisY.isActive, inactiveAxis:!rulePlaceholderModel.input.axisY.isActive}"><i class='fa' v-bind:class="classAxisY(rulePlaceholderModel.input.property)"></i></div>


            <input class="MinMax min input xAxis" v-bind:class="{inactive:!rulePlaceholderModel.input.axisX.isActive}" v-model="rulePlaceholderModel.input.min" v-on:mouseup="mouseUpFor($event,'input','min')" placeholder="-">
            <input class="MinMax max input xAxis" v-bind:class="{inactive:!rulePlaceholderModel.input.axisX.isActive}" v-model="rulePlaceholderModel.input.max" v-on:mouseup="mouseUpFor($event,'input','max')" placeholder="+">

            <input class="MinMax min input yAxis" v-bind:class="{inactive:!rulePlaceholderModel.input.axisY.isActive}" v-model="rulePlaceholderModel.input.min" v-on:mouseup="mouseUpFor($event,'input','min')" placeholder="-">
            <input class="MinMax max input yAxis" v-bind:class="{inactive:!rulePlaceholderModel.input.axisY.isActive}" v-model="rulePlaceholderModel.input.max" v-on:mouseup="mouseUpFor($event,'input','max')" placeholder="+">

            <!-- <input v-model="rulePlaceholderModel.input.axiss" style="width: 25%" placeholder="Input Axis"> -->
            <!--<select v-model="rulePlaceholderModel.input.axiss" style="height:35px; width:50px" placeholder="Axis" multiple>
              <option>x</option>
              <option>y</option>
            </select>-->
             <input class="input factor factorX" v-bind:class="activeFactor('axisX')" v-model="rulePlaceholderModel.factor.x" placeholder="1">
            <input class="input factor factorY" v-bind:class="activeFactor('axisY')" v-model="rulePlaceholderModel.factor.y" placeholder="1">
        </div>

        <!--<div class="factorY">{{rulePlaceholderModel.factor}}</div>-->
        <div class="rightSide" v-on:drop="dropForOutput" v-on:dragover="dragOverForOutput">
            <!--<div class="input" v-model="rulePlaceholderModel.output.id"></div>-->
            <div class="inputId button is-disabled">{{rulePlaceholderModel.output.name}}</div>

            <div class="iconAxis button" v-on:click="clickedOnAxis('output','axisX')" v-bind:class="{activeAxis:rulePlaceholderModel.output.axisX.isActive, inactiveAxis:!rulePlaceholderModel.output.axisX.isActive}"><i class='fa' v-bind:class="classAxisX(rulePlaceholderModel.output.property)"></i></div>
            <input class="MinMax min input xAxis" v-bind:class="{inactive:!rulePlaceholderModel.output.axisX.isActive}" v-model="rulePlaceholderModel.input.min" v-on:mouseup="mouseUpFor($event,'output','min')" placeholder="-">
            <input class="MinMax max input xAxis" v-bind:class="{inactive:!rulePlaceholderModel.output.axisX.isActive}" v-model="rulePlaceholderModel.input.max" v-on:mouseup="mouseUpFor($event,'output','max')" placeholder="+">

            <div class="iconAxis button" v-on:click="clickedOnAxis('output','axisY')" v-bind:class="{activeAxis:rulePlaceholderModel.output.axisY.isActive, inactiveAxis:!rulePlaceholderModel.output.axisY.isActive}"><i class='fa' v-bind:class="classAxisY(rulePlaceholderModel.output.property)"></i></div>
            <input class="MinMax min input yAxis" v-bind:class="{inactive:!rulePlaceholderModel.output.axisY.isActive}" v-model="rulePlaceholderModel.input.min" v-on:mouseup="mouseUpFor($event,'output','min')" placeholder="-">
            <input class="MinMax max input yAxis" v-bind:class="{inactive:!rulePlaceholderModel.output.axisY.isActive}" v-model="rulePlaceholderModel.input.max" v-on:mouseup="mouseUpFor($event,'output','max')" placeholder="+">
            <!--<input class="input" v-model="rulePlaceholderModel.output.property" placeholder="Output Property">
             <input v-model="rulePlaceholderModel.output.axiss" style="width: 25%" placeholder="Output Axis">
 -->
            <!-- <input class="MinMax min input" v-model="rulePlaceholderModel.output.min" v-on:mouseup="mouseUpFor($event,'output','min')" placeholder="Min"> -->
            <!-- <input class="MinMax max input" v-model="rulePlaceholderModel.output.max" v-on:mouseup="mouseUpFor($event,'output','max')" placeholder="Max"> -->

        </div>
        <div class="addOutput" v-on:drop="dropForOutput" v-on:dragover="dragOverForOutput">+</div>
    </div>
</template>
<script>

import Vue from 'vue'
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore,ShapeModel,RectangleModel,InputEventTouch, DiffModel} from '../store.js'

let ContextMenu = Vue.extend({
    template: `<div :style="styleObject">
    <p class="menu-label">
        Select property
      </p>
      <ul class="menu-list">
        <li v-for="eachProperty in properties"><a v-on:click="clickedOn(eachProperty)">{{eachProperty}}</a><li>
      </ul>
      </div>`,
      data: function() {
        return {
            startingX: 0,
            startingY: 0,
            onSelectedProperty: undefined,
            properties: ['position','size','color']
        }
      },
      computed: {
        styleObject: function() {
            return {
                left: this.startingX + 'px',
                top: this.startingY + 'px',
                position: 'absolute',
                'background-color': 'white'
            }
        }
      },
      methods: {
        clickedOn: function(propertyName) {
            this.onSelectedProperty(propertyName,['y'])
        }
      }
});

const acceptedInputTypes = ["text/diff-touch","text/diff-measure"]
const acceptedOutputTypes = ["text/diff-shape"]

export default {
    name: 'rule-placeholder',
    props:['rulePlaceholderModel'],
    data: function() {
        return {
            isActive: false
        }
    },
    watch: {
        rulePlaceholderModel: {
            handler: function(newValue,oldValue) {
                console.log('rulePlaceholderModel changed from '+ JSON.stringify(oldValue.toJSON())+" to "+JSON.stringify(newValue.toJSON()));
                globalStore.socket.emit('message-from-desktop', { type: "EDIT_RULE", message: newValue.toJSON() })
            },
            deep: true
        }
    },
    computed: {

    },
    methods: {
        classAxisX: function(property) {

            console.log("classAxisX: "+JSON.stringify(property))
            if (property) {
                return {
                    'fa-arrows-h': property.name == 'position',
                    'fa-sort fa-rotate-90': property.name == 'size',
                }
            }
            return {}
        },
        classAxisY: function(property) {
            console.log("classAxisY: "+JSON.stringify(property))
            if (property) {
                return {
                    'fa-arrows-v': property.name == 'position',
                    'fa-sort': property.name == 'size',
                }
            }
            return {}
        },
        clickedOnAxis: function(side,axisName) {
            this.rulePlaceholderModel[side][axisName].toggleActive()
        },
        activeFactor: function(axisName){
            if (this.rulePlaceholderModel.input[axisName].isActive){
                return
            }
            else{
                return "inactive";
            }
        },
        ruleComplete: function(){

            if ((this.rulePlaceholderModel.input.axisX.isActive || this.rulePlaceholderModel.input.axisY.isActive) && (this.rulePlaceholderModel.output.axisX.isActive || this.rulePlaceholderModel.output.axisY.isActive)) {
                return
            }
            else{
                return "inactive";
            }
        },
        dropForInput(event) {
            event.preventDefault();

            var dataType = this.draggedTypeFor(event.dataTransfer,acceptedInputTypes)
            var data = event.dataTransfer.getData(dataType);
            if (!data) {
                console.log("WEIRD, we accepted the drop but there is no data for us =(")
                return
            }
            console.log("dropForOutput >> " + data)

            let diffModel = new DiffModel(JSON.parse(data))

            this.rulePlaceholderModel.dropForInput(diffModel)

            if (this.rulePlaceholderModel.input.id != undefined && this.rulePlaceholderModel.output.id != undefined) {
                let visualState = globalStore.visualStates[diffModel.visualStateIndex]

                let outputBefore = visualState.shapesDictionary[this.rulePlaceholderModel.output.id]
                let outputAfter = visualState.nextState.shapesDictionary[this.rulePlaceholderModel.output.id]

                this.calculateFactor(this.rulePlaceholderModel.input.property,this.rulePlaceholderModel.output.property,diffModel.property.before,diffModel.property.after,outputBefore[this.rulePlaceholderModel.output.property.name],outputAfter[this.rulePlaceholderModel.output.property.name])
            }

        },
        dropForOutput(event) {
            event.preventDefault();

            var dataType = this.draggedTypeFor(event.dataTransfer,acceptedOutputTypes)
            var data = event.dataTransfer.getData(dataType);
            if (!data) {
                console.log("WEIRD, we accepted the drop but there is no data for us =(")
            }
            console.log("dropForOutput >> " + data)

            let diffModel = new DiffModel(JSON.parse(data))

            this.rulePlaceholderModel.dropForOutput(diffModel)

            if (this.rulePlaceholderModel.input.id != undefined && this.rulePlaceholderModel.output.id != undefined) {
                let visualState = globalStore.visualStates[diffModel.visualStateIndex]

                let inputPositionBefore = visualState.currentInputEvent.touches.find(aTouch => aTouch.id == this.rulePlaceholderModel.input.id)
                let inputPositionAfter
                if (inputPositionBefore) {
                    //Ok we found an touch with that id
                    inputPositionAfter = visualState.nextState.currentInputEvent.touches.find(aTouch => aTouch.id == this.rulePlaceholderModel.input.id)
                } else {
                    //Let's try a measure
                    inputPositionBefore = visualState.measureFor(this.rulePlaceholderModel.input.id)
                    inputPositionAfter = visualState.nextState.measureFor(this.rulePlaceholderModel.input.id)
                }

                this.calculateFactor(this.rulePlaceholderModel.input.property,this.rulePlaceholderModel.output.property,inputPositionBefore,inputPositionAfter,diffModel.property.before,diffModel.property.after)
            }
        },
        draggedTypeFor(dataTransfer,acceptedTypes) {
            let receivedTypes = [...dataTransfer.types]
            for (let acceptedType of acceptedTypes) {
                for (let receivedType of receivedTypes) {
                    if (acceptedType == receivedType) {
                        return acceptedType
                    }
                }
            }
            return undefined
        },
        dragOverForInput(event) {
            console.log("dragOverForInput >> " + event.dataTransfer.types)

            if (this.draggedTypeFor(event.dataTransfer,acceptedInputTypes)) {
                event.preventDefault()
            }
        },
        dragOverForOutput(event) {
            var dataType = event.dataTransfer.types;
            console.log("dragOverForOutput >> " + event.dataTransfer.types)

            if (this.draggedTypeFor(event.dataTransfer,acceptedOutputTypes)) {
                event.preventDefault()
            }
        },
        mouseUpFor(event,ruleSide,ruleSection) {
            // event.preventDefault()
            // event.stopPropagation()
            console.log("rulePlaceholderModel >> mouseUpFor ruleSide: " + ruleSide + " ruleSection: " + ruleSection)
            let linkingObject = globalStore.toolbarState.linkingObject
            if (linkingObject) {
                switch(ruleSide) {
                    case 'mainCondition':
                        //This should only work if the linkingObject can act as an input
                        console.log("Ignoring link in mainCondition")
                        return
                        break;
                    case 'input':
                        //This should only work if the linkingObject can act as an input
                        if (!linkingObject instanceof InputEventTouch) {
                            console.log("Ignoring link in inputRule")
                            return
                        }
                        break;
                    case 'output':
                        //This should only work if the linkingObject can act as an output
                        if (!linkingObject instanceof ShapeModel) {
                            console.log("Ignoring link in outputRule")
                            return
                        }
                        break;
                    default:
                        console.log("Unrecognized rule side: " + ruleSide)
                }

                if (ruleSection == 'min' || ruleSection == 'max') {
                    let aRuleSide = this.rulePlaceholderModel[ruleSide]
                    if (aRuleSide.type && aRuleSide.id && aRuleSide.property && aRuleSide.axiss.length > 0) {
                        //If we have data in the input/output (type,id,property,axiss) later we infer the min/max axis
                        // for (let eachAxis of aRuleSide.axiss) {
                            //TODO binding is not working here
                            aRuleSide[ruleSection] = linkingObject[aRuleSide.property]
                        // }
                    } else {
                        let newContextMenu = new ContextMenu()
                        newContextMenu.startingX = event.pageX;
                        newContextMenu.startingY = event.pageY;

                        newContextMenu.onSelectedProperty = function(property,axis) {
                            // for (let eachAxis of axis) {
                            //     value[eachAxis] = linkingObject[property].value[eachAxis]
                            // }
                            // this[ruleSectionToFill] = value
                            aRuleSide[ruleSection] = linkingObject[property]
                            newContextMenu.$el.remove()
                            newContextMenu.$destroy()
                        }.bind(this)

                        newContextMenu.$mount()
                        window.document.body.appendChild(newContextMenu.$el)
                    }
                }
            }
        },
        calculateFactor(inputProperty,outputProperty,inputBefore,inputAfter,outputBefore,outputAfter) {
            // input * factor = output => factor = output/input
            let deltaOutput = {x:1,y:1}
            let deltaInput = {x:1,y:1}

            switch (inputProperty.name) {
                case 'position': {
                    if (inputAfter.x) {
                        deltaInput.x = inputAfter.x - inputBefore.x
                        deltaInput.y = inputAfter.y - inputBefore.y
                    } else {
                        deltaInput.x = inputAfter.initialPoint.x - inputBefore.initialPoint.x
                        deltaInput.y = inputAfter.initialPoint.y - inputBefore.initialPoint.y
                    }
                    break;
                }
                case 'size': {
                    if (inputAfter.radiusX) {
                        deltaInput.x = inputAfter.radiusX - inputBefore.radiusX
                        deltaInput.y = inputAfter.radiusY - inputBefore.radiusY
                    } else {
                        //it's a measure?
                        deltaInput.x = inputAfter.width - inputBefore.width
                        deltaInput.y = inputAfter.height - inputBefore.height

                    }
                    break;
                }
            }
            switch (outputProperty.name) {
                case 'position': {
                    deltaOutput.x = outputAfter.x - outputBefore.x
                    deltaOutput.y = outputAfter.y - outputBefore.y
                    break;
                }
                case 'size': {
                    deltaOutput.x = outputAfter.w - outputBefore.w
                    deltaOutput.y = outputAfter.h - outputBefore.h
                    break;
                }
            }
            this.rulePlaceholderModel.factor.x = deltaOutput.x / deltaInput.x;
            this.rulePlaceholderModel.factor.y = deltaOutput.y / deltaInput.y;
        }
    },
    computed: {
        activeColor: function() {
            return this.isActive ? '#00d1b2' : 'white'
        }
    }
}
</script>
<style scoped>
.input {
    font-size:1.1em;
    font-family: futura;
    padding: 2px;
    width: 30%;
}

.inputId{
    font-size:1.1em;
    font-family: futura;
    padding: 2px;
    width: 45px;
    height: 40px;
    opacity: 1 !important;
    margin-left: 8px;
}

.iconAxis{
    width: 40px;
    height: 40px;
    margin-left: 10px;
    margin-right: 10px;
}

.rule-placeholder {
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    flex-basis: auto;
    margin: 10px;
    overflow: visible; /* Or flex might break */
    font-size: 1em;
    padding: 5px !important;
    width: 196px;
    margin-bottom: 5px !important;
    height: 200px;
    border: 1px solid #00d1b2;
}
.leftSide {
    height: 65px;
    position: relative;
    padding-top: 4px;
    background-color: #eeeeee;
    margin-bottom: 3px;
}
.rightSide {
    height: 65px;
    position: relative;
    padding-top: 18px;
    background-color: #eeeeee;
}
.condition {
    width: 100%;
    height: 30px;
    border: none;
    color: #333333;
    margin-bottom: 3px;
    font-size: 1em;
    text-align: center;
    box-shadow: none !important;
    background-color: #eeeeee;
    /*height: 50px;*/
}
.condition:placeholder-shown {
    font-size: 0.9em;
    /*height: 50px;*/
}
.condition::-webkit-input-placeholder{
    color: #eeeeee;
}
.condition:hover::-webkit-input-placeholder{
    color: #aaaaaa;
}
.MinMax {
    position:absolute;
    border-radius: 20px;
    width: 15px;
    height: 15px;
    border: 1px solid #eeeeee;
    background-color: #333333;
    color: #ffffff;
    text-align: center;
    font-size: 0.6em;
    top:16px;
}
.rightSide > .MinMax{
    top: 30px;
}
.MinMax:placeholder-shown{
    background-color: #eeeeee;
    border: 1px solid #cccccc;
    color: #cccccc !important;
    border-radius: 10px;
    width: 15px;
    height: 15px;
    font-size: 0.7em;
}
.MinMax:focus {
    border-radius: 20px;
    min-width: 25%;
    height: 25px;
    border: 1px solid #333333;
    background-color: #333333;
    color: #eeeeee;
    text-align: center;
    font-size: 0.8em;
    z-index: 200;
    top:12px;
}
.MinMax.min.yAxis {
    left:125px;
}
.MinMax.max.yAxis {
    left:164px;
}
.MinMax.min.xAxis {
    left:61px;
}
.MinMax.max.xAxis {
    left:100px;
}

.factorContainer {

    height: 35px;
    padding-left: 56px;
}
.factor {
    position: absolute;
    top: 50px;
    text-align: center;
    width: 40px;
    height: 30px;
    margin-left: 10px;
    margin-right: 10px;
    font-size:0.9em;
    font-family: futura;
    z-index: 20;
}
.factorX {
    left: 58px;
}
.factorY {
    left: 121px;
}

.activeAxis{
    background-color: white;
}
.inactiveAxis{
    background-color: #dddddd;
    color: #aaaaaa;
}

.inactive{
    background-color: #dddddd;
    border: 1px solid #dddddd;
    color: #aaaaaa;
    box-shadow: none;
}

.addOutput{
    max-height: 20px;
    margin-top: 3px;
    background-color: #eeeeee;
    border: 1px solid #eeeeee;
    text-align: center;
    font-family: futura;
    color: #aaaaaa;
}
</style>