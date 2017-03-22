<template>
    <div class='box rule-placeholder' v-bind:class="ruleComplete()" :style="{ backgroundColor: activeColor , height: (200 + 65 * (rulePlaceholderModel.outputs.length - 1)) + 'px'}">
        <input class="condition input" v-on:mouseup="mouseUpFor($event,'mainCondition')" placeholder="Main Condition">
        <div class="leftSide" v-on:drop="dropForInput" v-on:dragover="dragOverForInput">
            <!--<div class="input" v-model="rulePlaceholderModel.input.id"></div>-->
            <div class="inputId button is-disabled">{{rulePlaceholderModel.input.name}}</div>
            <div class="iconAxis button" v-on:click="clickedOnAxis(rulePlaceholderModel.input,'axisX')" v-bind:class="{activeAxis:rulePlaceholderModel.input.axisX.isActive, inactiveAxis:!rulePlaceholderModel.input.axisX.isActive}"><i class='fa' v-bind:class="classAxisX(rulePlaceholderModel.input.property)"></i></div>
            <div class="iconAxis button" v-on:mouseup="clickedOnAxis(rulePlaceholderModel.input,'axisY')" v-bind:class="{activeAxis:rulePlaceholderModel.input.axisY.isActive, inactiveAxis:!rulePlaceholderModel.input.axisY.isActive}"><i class='fa' v-bind:class="classAxisY(rulePlaceholderModel.input.property)"></i></div>


            <input class="MinMax min input xAxis" v-bind:class="{inactive:!rulePlaceholderModel.input.axisX.isActive}" v-model="rulePlaceholderModel.input.axisX.min" v-on:mouseup="mouseUpFor($event,rulePlaceholderModel.input,'min','x')" placeholder="-">
            <input class="MinMax max input xAxis" v-bind:class="{inactive:!rulePlaceholderModel.input.axisX.isActive}" v-model="rulePlaceholderModel.input.axisX.max" v-on:mouseup="mouseUpFor($event,rulePlaceholderModel.input,'max','x')" placeholder="+">

            <input class="MinMax min input yAxis" v-bind:class="{inactive:!rulePlaceholderModel.input.axisY.isActive}" v-model="rulePlaceholderModel.input.axisY.min" v-on:mouseup="mouseUpFor($event,rulePlaceholderModel.input,'min','y')" placeholder="-">
            <input class="MinMax max input yAxis" v-bind:class="{inactive:!rulePlaceholderModel.input.axisY.isActive}" v-model="rulePlaceholderModel.input.axisY.max" v-on:mouseup="mouseUpFor($event,rulePlaceholderModel.input,'max','y')" placeholder="+">
             <input class="input factor factorX" v-bind:class="activeFactor('axisX')" v-model="rulePlaceholderModel.factor.x" placeholder="1">
            <input class="input factor factorY" v-bind:class="activeFactor('axisY')" v-model="rulePlaceholderModel.factor.y" placeholder="1">
        </div>

        <div v-for="eachOutput in rulePlaceholderModel.outputs" class="rightSide" v-on:drop="dropForOutput($event,eachOutput)" v-on:dragover="dragOverForOutput">
            <div class="inputId button is-disabled">{{eachOutput.name}}</div>

            <div class="iconAxis button" v-on:click="clickedOnAxis(eachOutput,'axisX')" v-bind:class="{activeAxis:eachOutput.axisX.isActive, inactiveAxis:!eachOutput.axisX.isActive}"><i class='fa' v-bind:class="classAxisX(eachOutput.property)"></i></div>
            <input class="MinMax min input xAxis" v-bind:class="{inactive:!eachOutput.axisX.isActive}" v-model="eachOutput.axisX.min" v-on:mouseup="mouseUpFor($event,eachOutput,'min','x')" placeholder="-">
            <input class="MinMax max input xAxis" v-bind:class="{inactive:!eachOutput.axisX.isActive}" v-model="eachOutput.axisX.max" v-on:mouseup="mouseUpFor($event,eachOutput,'max','x')" placeholder="+">

            <div class="iconAxis button" v-on:click="clickedOnAxis(eachOutput,'axisY')" v-bind:class="{activeAxis:eachOutput.axisY.isActive, inactiveAxis:!eachOutput.axisY.isActive}"><i class='fa' v-bind:class="classAxisY(eachOutput.property)"></i></div>
            <input class="MinMax min input yAxis" v-bind:class="{inactive:!eachOutput.axisY.isActive}" v-model="eachOutput.axisY.min" v-on:mouseup="mouseUpFor($event,eachOutput,'min','y')" placeholder="-">
            <input class="MinMax max input yAxis" v-bind:class="{inactive:!eachOutput.axisY.isActive}" v-model="eachOutput.axisY.max" v-on:mouseup="mouseUpFor($event,eachOutput,'max','y')" placeholder="+">

        </div>
        <div class="addOutput" v-on:drop="dropForOutput($event,undefined)" v-on:dragover="dragOverForOutput">+</div>
    </div>
</template>
<script>

import Vue from 'vue'
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore,ShapeModel,RectangleModel,InputEventTouch, DiffModel, RuleSidePlaceholder} from '../store.js'

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
        clickedOnAxis: function(sideRule,axisName) {
            sideRule[axisName].toggleActive()
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
            if (!this.rulePlaceholderModel.isComplete) {
                return "inactive"
            }
            return
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

            if (this.rulePlaceholderModel.input.id != undefined && this.rulePlaceholderModel.outputs[0].id != undefined) {
                let visualState = globalStore.visualStates[diffModel.visualStateIndex]

                let outputBefore = visualState.shapesDictionary[this.rulePlaceholderModel.outputs[0].id]
                let outputAfter = visualState.nextState.shapesDictionary[this.rulePlaceholderModel.outputs[0].id]

                this.calculateFactor(this.rulePlaceholderModel.input.property,this.rulePlaceholderModel.outputs[0].property,diffModel.property.before,diffModel.property.after,outputBefore[this.rulePlaceholderModel.outputs[0].property.name],outputAfter[this.rulePlaceholderModel.outputs[0].property.name])
            }

        },
        dropForOutput(event,outputRule) {
            event.preventDefault();

            var dataType = this.draggedTypeFor(event.dataTransfer,acceptedOutputTypes)
            var data = event.dataTransfer.getData(dataType);
            if (!data) {
                console.log("WEIRD, we accepted the drop but there is no data for us =(")
            }
            console.log("dropForOutput >> " + data)

            let diffModel = new DiffModel(JSON.parse(data))

            if (outputRule == undefined) {
                outputRule = new RuleSidePlaceholder({type:undefined,id:undefined,property:undefined})
                this.rulePlaceholderModel.outputs.push(outputRule)
            }
            this.rulePlaceholderModel.dropForOutput(outputRule,diffModel)

            if (this.rulePlaceholderModel.input.id != undefined && outputRule.id != undefined) {
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

                this.calculateFactor(this.rulePlaceholderModel.input.property,outputRule.property,inputPositionBefore,inputPositionAfter,diffModel.property.before,diffModel.property.after)
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
        mouseUpFor(event,aRuleSide,maxOrMin,axis) {
            // event.preventDefault()
            // event.stopPropagation()
            console.log("rulePlaceholderModel >> mouseUpFor ruleSide: " + aRuleSide + " axis: " + axis + " maxOrMin: " + maxOrMin)

            let axisName = axis=='x'?'axisX':'axisY'

            let linkingObject = globalStore.toolbarState.linkingObject
            if (linkingObject) {
                switch(aRuleSide) {
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
                        console.log("Unrecognized rule side: " + aRuleSide)
                }

                if (maxOrMin == 'min' || maxOrMin == 'max') {
                    if (aRuleSide.type && aRuleSide.id && aRuleSide.property && aRuleSide.axiss.length > 0) {
                        //If we have data in the input/output (type,id,property,axiss) later we infer the min/max axis
                        // for (let eachAxis of aRuleSide.axiss) {
                            //TODO binding is not working here
                            aRuleSide[axisName][maxOrMin] = linkingObject.valueForProperty(aRuleSide.property.name)[axis]
                        // }
                    } else {
                        let newContextMenu = new ContextMenu()
                        newContextMenu.startingX = event.pageX;
                        newContextMenu.startingY = event.pageY;

                        newContextMenu.onSelectedProperty = function(propertyName,axis) {
                            // for (let eachAxis of axis) {
                            //     value[eachAxis] = linkingObject[property].value[eachAxis]
                            // }
                            // this[ruleSectionToFill] = value
                            aRuleSide[ruleSection][axisName] = linkingObject.valueForProperty(propertyName)[axis]
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
                    deltaOutput.x = outputAfter.x - outputBefore.x
                    deltaOutput.y = outputAfter.y - outputBefore.y
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
    height: 55px;
    position: relative;
    padding-top: 10px;
    background-color: #eeeeee;
}

.rule-placeholder .rightSide:nth-of-type(2) {
    height: 65px;
    padding-top: 18px;
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
.rightSide:nth-child(3) > .MinMax {
    top: 30px;
}
.rightSide > .MinMax {
    top: 22px;
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