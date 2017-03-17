<template>
    <div class='box rule-placeholder'>
        <input class="condition input" v-on:mouseup="mouseUpFor($event,'mainCondition')" placeholder="Main Condition">
        <div class="leftSide" v-on:drop="dropForInput" v-on:dragover="dragOverForInput" v-on:mouseup="mouseUpFor($event,'input')" :style="{ backgroundColor: activeColor }">
            <input class="input" v-model="rulePlaceholderModel.input.type" placeholder="Type">
            <input class="input" v-model="rulePlaceholderModel.input.id" placeholder="Id">
            <input class="MinMax min input" v-model="rulePlaceholderModel.input.min" v-on:mouseup="mouseUpFor($event,'input','min')" placeholder="m">
            <input class="MinMax max input" v-model="rulePlaceholderModel.input.max" v-on:mouseup="mouseUpFor($event,'input','max')" placeholder="M">
            <input class="input" v-model="rulePlaceholderModel.input.property" placeholder="Property">
            <!-- <input v-model="rulePlaceholderModel.input.axiss" style="width: 25%" placeholder="Input Axis"> -->
            <select v-model="rulePlaceholderModel.input.axiss" style="height:35px; width:50px" placeholder="Axis" multiple>
              <option>x</option>
              <option>y</option>
            </select>
        </div>
        <div class="factor">{{rulePlaceholderModel.factor}}</div>
        <div class="rightSide" v-on:drop="dropForOutput" v-on:dragover="dragOverForOutput" v-on:mouseup="mouseUpFor($event,'output')" :style="{ backgroundColor: activeColor }">
            <input class="input" v-model="rulePlaceholderModel.output.type" placeholder="Output Type">
            <input class="input" v-model="rulePlaceholderModel.output.id" placeholder="Output Id">
            <input class="input" v-model="rulePlaceholderModel.output.property" placeholder="Output Property">
<!--             <input v-model="rulePlaceholderModel.output.axiss" style="width: 25%" placeholder="Output Axis">
 -->
            <select v-model="rulePlaceholderModel.output.axiss" style="height:35px; width:50px" placeholder="Output Axis" multiple>
              <option>x</option>
              <option>y</option>
            </select>
            <input class="MinMax min input" v-model="rulePlaceholderModel.output.min" v-on:mouseup="mouseUpFor($event,'output','min')" placeholder="Min">
            <input class="MinMax max input" v-model="rulePlaceholderModel.output.max" v-on:mouseup="mouseUpFor($event,'output','max')" placeholder="Max">
        </div>
    </div>
</template>
<script>

import Vue from 'vue'
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore,ShapeModel,InputEventTouch} from '../store.js'

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
            properties: ['translation','scaling','color']
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
                console.log('rulePlaceholderModel changed to '+newValue+" ("+oldValue+")");
                globalStore.socket.emit('message-from-desktop', { type: "EDIT_RULE", message: newValue })
            },
            deep: true
        }
    },
    methods: {
        dropForInput(event) {
            event.preventDefault();
            var data = event.dataTransfer.getData("text/diff-touch");

            let dataObject = undefined
            if (data) {
                //It's an touch input
                dataObject = JSON.parse(data)

                this.rulePlaceholderModel.input.type = "touch";
                this.rulePlaceholderModel.input.property = "translation"
            } else {
                data = event.dataTransfer.getData("text/diff-measure");
                if (data) {
                    //It's a measure
                    dataObject = JSON.parse(data)
                    // {type:'point', fromType: 'distance', fromId:'distance0',fromHandler:'center',toType:'distance', toId:'distance0',toHandler:'center',axiss:['y']},
                    this.rulePlaceholderModel.input.type = "measure"
                    this.rulePlaceholderModel.input.property = dataObject.property.name

                }
            }

            this.rulePlaceholderModel.input.id = dataObject.id

            this.rulePlaceholderModel.input.axiss = []
            if (dataObject.property.before.x != dataObject.property.after.x) {
                this.rulePlaceholderModel.input.axiss.push('x')
            }
            if (dataObject.property.before.y != dataObject.property.after.y) {
                this.rulePlaceholderModel.input.axiss.push('y')
            }

            //To account for the ≠ naming of the scaling axis (w & h)
            if (dataObject.property.before.w != dataObject.property.after.w) {
                this.rulePlaceholderModel.output.axiss.push('x')
            }
            if (dataObject.property.before.h != dataObject.property.after.h) {
                this.rulePlaceholderModel.output.axiss.push('y')
            }

            if (this.rulePlaceholderModel.input.id != undefined && this.rulePlaceholderModel.output.id != undefined) {
                let visualState = globalStore.visualStates[dataObject.visualStateIndex]
                //the dataObject have the input diff values

                this.rulePlaceholderModel.output.property //TODO We assume this is 'translation'
                let outputPositionBefore = visualState.shapesDictionary[this.rulePlaceholderModel.output.id].position
                let outputPositionAfter = visualState.nextState.shapesDictionary[this.rulePlaceholderModel.output.id].position

                this.calculateFactor(dataObject.property.before,dataObject.property.after,outputPositionBefore,outputPositionAfter)
            }

        },
        dropForOutput(event) {
            event.preventDefault();
            var data = event.dataTransfer.getData("text/diff-shape");

            //data = {"id":"shape0","type":"output","property":{"name":"translation","before":{"x":141,"y":126},"after":{"x":141,"y":195}}}

            // let outputRuleObject = {}
            // outputRuleObject.id = data.id
            // outputRuleObject.property = "translation"
            // outputRuleObject.
            console.log("dropForOutput >> " + data)
            let dataObject = JSON.parse(data)
            this.rulePlaceholderModel.output.type = "shape"
            this.rulePlaceholderModel.output.id = dataObject.id
            this.rulePlaceholderModel.output.property = dataObject.property.name

            this.rulePlaceholderModel.output.axiss = []
            if (dataObject.property.before.x != dataObject.property.after.x) {
                this.rulePlaceholderModel.output.axiss.push('x')
            }
            if (dataObject.property.before.y != dataObject.property.after.y) {
                this.rulePlaceholderModel.output.axiss.push('y')
            }

            //To account for the ≠ naming of the scaling axis (w & h)
            if (dataObject.property.before.w != dataObject.property.after.w) {
                this.rulePlaceholderModel.output.axiss.push('x')
            }
            if (dataObject.property.before.h != dataObject.property.after.h) {
                this.rulePlaceholderModel.output.axiss.push('y')
            }

            if (this.rulePlaceholderModel.input.id != undefined && this.rulePlaceholderModel.output.id != undefined) {
                let visualState = globalStore.visualStates[dataObject.visualStateIndex]
                //the dataObject have the input diff values

                this.rulePlaceholderModel.input.property //TODO We assume this is 'translation'
                let inputPositionBefore = visualState.currentInputEvent.touches.find(aTouch => aTouch.id == this.rulePlaceholderModel.input.id)
                let inputPositionAfter = visualState.nextState.currentInputEvent.touches.find(aTouch => aTouch.id == this.rulePlaceholderModel.input.id)

                this.calculateFactor(inputPositionBefore,inputPositionAfter,dataObject.property.before,dataObject.property.after)
            }
        },
        dragOverForInput(event) {
            var dataType = event.dataTransfer.types;
            console.log("dragOverForInput >> " + dataType)
            if ([...dataType].includes("text/diff-touch")) {
                event.preventDefault()
            }
            if ([...dataType].includes("text/diff-measure")) {
                event.preventDefault()
            }
        },
        dragOverForOutput(event) {
            var dataType = event.dataTransfer.types;
            console.log("dragOverForOutput >> " + dataType)

            if ([...dataType].includes("text/diff-shape")) {
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
                            aRuleSide[ruleSection] = linkingObject[aRuleSide.property].value
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
                            aRuleSide[ruleSection] = linkingObject[property].value
                            newContextMenu.$el.remove()
                            newContextMenu.$destroy()
                        }.bind(this)

                        newContextMenu.$mount()
                        window.document.body.appendChild(newContextMenu.$el)
                    }
                }
            }
        },
        calculateFactor(inputPositionBefore,inputPositionAfter,outputPositionBefore,outputPositionAfter) {
            // input * factor = output => factor = output/input
            this.rulePlaceholderModel.factor.x = (outputPositionAfter.x - outputPositionBefore.x) / (inputPositionAfter.x - inputPositionBefore.x); //because Nacho asked
            this.rulePlaceholderModel.factor.y = (outputPositionAfter.y - outputPositionBefore.y) / (inputPositionAfter.y - inputPositionBefore.y);
        }
    },
    computed: {
        activeColor: function() {
            return this.isActive ? 'gray' : 'white'
        }
    }
}
</script>
<style scoped>
input {
    font-size:1.1em;
    font-family: futura;
    padding: 2px;
    width: 30%;
}

.rule-placeholder {
     display: flex;
     flex-basis: auto;
     flex-direction: column;
     margin: 10px;
     overflow: visible; /* Or flex might break */
     font-size: 1em;
     padding: 5px !important;
     width: 250px;
     margin-bottom: 5px !important;
     height: 150px;
}
.leftSide {
    /*height: 50px;*/
    position: relative;
    display:flex;
    flex-direction: row;
}
.rightSide {
    /*height: 50px;*/
    position: relative;
    display: flex;
    flex-direction: row;
}
.condition {
    width: 100%;
    /*height: 50px;*/
}
.MinMax {
    position:absolute;
    border-radius: 20px;
    width: 30%;
    height: 25px;
    border: 1px solid #ffffff;
    background-color: #333333;
    color: #ffffff;
    text-align: center;
    font-size: 0.8em;
}
.MinMax:placeholder-shown{
    background-color: rgba(255,255,255,1);
    border: 1px solid #333333;
    color: #ffffff;
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
}
.MinMax.min {
    top:-10px;
    left:0px;
}
.MinMax.max {
    top:20px;
    left:0px;
}
.factor {
    font-size:1.1em;
    font-family: futura;
    text-align: center;
}
</style>