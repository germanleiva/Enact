<template>
    <div class='rule'>
        <input class="condition" v-model="mainCondition">
        <div class="leftSide" v-on:drop="dropForInput" v-on:dragover="dragOverForInput">
            <input v-model="inputRule" style="width: 100%">
        </div>
        <div class="rightSide" >
            <input v-model="outputRule" style="width: 100%" v-on:drop="dropForOutput" v-on:dragover="dragOverForOutput">
            <input class="outputCondition" v-model="outputMinimum" placeholder="Min output">
            <input class="outputCondition" v-model="outputMaximum" placeholder="Max output">
        </div>
    </div>
</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'
import Rule from './Rule.vue'

export default {
    name: 'rule-area',
    data: function() {
        return {
            mainCondition: "function(touch, shape) { return shape.left < touch.pageX && shape.top < touch.pageY && shape.left + shape.width > touch.pageX && shape.top + shape.height > touch.pageY;}",
            inputRule: "F1 ↕",
            outputRule: "R1 ↕",
            outputMinimum: "",
            outputMaximum: ""
        }
    },
    components: {
        'rule':Rule
    },
    methods: {
        dropForInput(event) {
            event.preventDefault();
            var data = event.dataTransfer.getData("text/input");
            if (data) {
                //It's an input
            } else {
                data = event.dataTransfer.getData("text/measure");
                if (data) {
                    //It's a measure
                }
            }
            this.inputRule = data
        },
        dropForOutput(event) {
            event.preventDefault();
            var data = event.dataTransfer.getData("text/output");

            //{"id":"shape0","type":"output","translation":{"previousValue":{"x":72,"y":89},"newValue":{"x":129,"y":192}}}

            // let outputRuleObject = {}
            // outputRuleObject.id = data.id
            // outputRuleObject.property = "translation"
            // outputRuleObject.

            this.outputRule = data

        },
        dragOverForInput(event) {
            var dataType = event.dataTransfer.types;
            console.log("dragOverForInput >> " + dataType)
            if (dataType == "text/input") {
                event.preventDefault()
            }
            if (dataType == "text/measure") {
                event.preventDefault()
            }
        },
        dragOverForOutput(event) {
            var dataType = event.dataTransfer.types;
            console.log("dragOverForOutput >> " + dataType)

            if (dataType == "text/output") {
                event.preventDefault()
            }
        }
    },
    computed: {
        rulesModel: function() {
            return globalStore.rules
        }
    }
}
</script>
<style scoped>
input {
    font-size:24px;
}

.rule {
    display: flex;
    margin: 10px;
    overflow: hidden; /* Or flex might break */
    flex-wrap: wrap;
    font-size: 2em;
}
.leftSide {
    width: 50%;
    /*height: 50px;*/
    background-color: green
}
.rightSide {
    width: 50%;
    /*height: 50px;*/
    background-color: red;
    display: flex;
    flex-wrap: wrap;
}
.condition {
    width: 100%;
    /*height: 50px;*/
}
.outputCondition {
    width: 50%;
    /*height: 50px;*/
}
</style>