import { getCommonElements, compareWithoutCase } from '../utils';

let num1: number[] = [1,2,3,4,5];
let num2: number[] = [3,4,5,6,7];

describe('utils test', () => {
    test('getCommonElements', () => {
        expect(getCommonElements<number>(num1, num2)).toEqual([3,4,5]);
    });

    test('compareWithoutCase', () => {
        expect(compareWithoutCase('Abc', 'abC')).toBeTruthy();
    });
});
