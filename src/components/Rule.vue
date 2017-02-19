<template>
    <div class='rule'>
        <input class="condition" v-model="inputCondition">
        <input class="condition" v-model="outputCondition">
        <div class="ruleElement" v-on:drop="dropForInput" v-on:dragover="dragOverForInput"></div>
        <div class="ruleElement" v-on:drop="dropForOutput" v-on:dragover="dragOverForOutput"></div>
    </div>
</template>
<script>

import {globalStore} from '../store.js'
import Rule from './Rule.vue'

export default {
    name: 'rule-area',
    data: function() {
        return {
            inputCondition: "function(touch, shape) { return shape.left < touch.pageX && shape.top < touch.pageY && shape.left + shape.width > touch.pageX && shape.top + shape.height > touch.pageY;}",
            outputCondition: "function(oldValue, newValue) { if (!r1_initial_y_position) { r1_initial_y_position = allShapes['shape0'].top; } return newValue <= r1_initial_y_position}"
        }
    },
    components: {
        'rule':Rule
    },
    methods: {
        dropForInput(event) {
            event.preventDefault();
            var data = event.dataTransfer.getData("text/input");
            console.log("Rule >> dropForInput text/input" + data)

            data = event.dataTransfer.getData("text/measure");
            console.log("Rule >> dropForInput text/measure" + data)
        },
        dropForOutput(event) {
            event.preventDefault();
            var data = event.dataTransfer.getData("text/output");
            console.log("Rule >> dropForOutput" + data)
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
.rule {
    display: flex;
    margin: 10px;
    overflow: hidden; /* Or flex might break */
    flex-wrap: wrap;
}
.ruleElement {
    width: 50%;
    height: 50px;
    background-color: red
}
.condition {
    width: 50%;
    height: 50px;
}
</style>