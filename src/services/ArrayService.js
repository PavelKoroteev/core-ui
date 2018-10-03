export default class {
    static checkArrForDeficit(arr, minValue, properSum) {
        let array = arr.slice();
        array.forEach((el, i) => {
            if (el < minValue || el === undefined) {
                array = this.nip(array, i, minValue);
            }
        });

        let sumOfAll = 0;
        array.forEach((el) => {
            sumOfAll += el;
        });
        if (properSum && sumOfAll !== properSum) {
            const diff = Math.abs(sumOfAll - properSum);
            if (sumOfAll > properSum) {
                const indexMax = array.indexOf(Math.max(...array));
                array[indexMax] -= diff;
            } else {
                const indexMin = array.indexOf(Math.min(...array));
                array[indexMin] += diff;
            }
        }

        return array;
    }

    static nip(arr, index, newVal, minValue, maxSumm) {
        const array = arr.slice();
        let newValue = newVal;
        if (newValue < minValue) {
            newValue = minValue;
        }
        array[index] = array[index] || 0;
        const diff = newValue - array[index];
        if (diff === 0) {
            return array;
        }

        const amountRecipient = array.length - 1;
        let changeForMost;
        let changeForEvery;
        let rest = 0;
        const arrDiff = [];
        let arrWidth = [];

        if (diff < 0) { //decrease target (increase recipient)
            changeForMost = diff % amountRecipient;
            changeForEvery = (diff - changeForMost) / amountRecipient;

            array.forEach((el, i) => {
                arrWidth.push(el);
                i !== index && arrDiff.push(el);
            });

            let indexMinimal;
            const sortedArrWidth = arrWidth.slice().sort();
            let j = 0;
            do {
                indexMinimal = arrWidth.indexOf(sortedArrWidth[j]);
                j++;
            } while (indexMinimal === index && j !== arrWidth.length);
            if (indexMinimal === index) {
                if (index === array.length - 1) {
                    indexMinimal = 0;
                } else {
                    indexMinimal = array.length - 1;
                }
            }

            arrWidth.forEach((el, i, currArr) => {
                if (i === index) {
                    currArr[i] = newValue;
                } else {
                    currArr[i] -= changeForEvery;
                    if (i === indexMinimal) {
                        currArr[i] -= changeForMost;
                    }
                }
            });
        } //end of decrease target

        if (diff > 0) { //increase target width (decrease recipient)
            array.forEach((el, i) => {
                arrWidth.push(el);
                i !== index && arrDiff.push(el - minValue);
            });

            let amountNaturalElementInDiffArr = 0;
            arrDiff.forEach((el) => {
                if (el > 0) {
                    amountNaturalElementInDiffArr++;
                }
            });

            if (!amountNaturalElementInDiffArr) {
                return arrWidth;
            }

            changeForMost = diff % amountNaturalElementInDiffArr;
            changeForEvery = (diff - changeForMost) / amountNaturalElementInDiffArr;

            const maxOfArrDiff = Math.max(Math.max(...arrDiff));
            const indexMaximalInWidth = arrWidth.indexOf(maxOfArrDiff);
            const indexMaximalInDiff = arrDiff.indexOf(maxOfArrDiff);

            arrDiff.forEach((el, i, currArr) => {
                if (el <= 0) {
                    return;
                }
                const chan = i === indexMaximalInDiff ? changeForMost + changeForEvery : changeForEvery;
                if (el > chan) {
                    currArr[i] -= chan;
                } else {
                    currArr[i] = 0;
                    rest += chan - el;
                }
            });

            //insert "target" width
            arrDiff.splice(index, 0, newValue - minValue);
            arrWidth = arrDiff.map(el => (el || 0) + minValue);

            if (rest !== 0) {
                if (arrWidth[indexMaximalInWidth] > rest - minValue) {
                    arrWidth[indexMaximalInWidth] -= rest;
                } else {
                    arrWidth[index] -= rest;
                }
            }
        } //end of increase target

        arrWidth = this.checkArrForDeficit(arrWidth, minValue, maxSumm);

        return arrWidth;
    }

    static getArrayPropertiesOfCollection(collection, property) {
        const array = [];
        collection.forEach((model, i) => {
            array[i] = model.get(property);
        });
        return array;
    }

    static setArrayPropertiesToCollection(array, collection, property) {
        collection.forEach((model, i) => {
            model.set(property, array[i]);
        });
        return collection;
    }
}
