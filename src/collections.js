function extendArray(arrayConstructor)
{
    if (!arrayConstructor.prototype.first) {
        arrayConstructor.prototype.first = function() {
            return this[0];
        }
    }
    if (!arrayConstructor.prototype.last) {
        arrayConstructor.prototype.last = function() {
            return this[this.length - 1];
        }
    }
    if (!arrayConstructor.prototype.removeAll) {
        arrayConstructor.prototype.removeAll = function() {
            return this.splice(0, this.length);
        }
    }
    if (!arrayConstructor.prototype.remove) {
        arrayConstructor.prototype.remove = function(x) {
            let i = this.indexOf(x)
            if (i >= 0) {
                return this.splice(i,1);
            }
        }
    }
    if (!arrayConstructor.prototype.includes) {
        arrayConstructor.prototype.includes = function(element) {
            return this.indexOf(element) >= 0
        }
    }
    if (!arrayConstructor.prototype.insert) {
        arrayConstructor.prototype.insert = function(index, element) {
            this.splice( index, 0, element );
        }
    }
}

export { extendArray }