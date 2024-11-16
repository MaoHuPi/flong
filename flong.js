/* 
 * MaoHuPi (c) 2024
 * flong.js
 * handle long float with specify float digits
 */

class Flong {
	constructor({ valueString = '', floatDigits = 50 }) {
		if (valueString == '') {
			this.floatDigits = floatDigits;

			this.value = BigInt(0);
		} else {
			this.floatDigits = floatDigits;

			valueString = valueString.toLowerCase();
			let scientificNotation = valueString.includes('e');
			let scientificNotationPart = '';
			if (scientificNotation) {
				let valueSplitted = valueString = valueString.split('e');
				if (valueSplitted.length > 2) throw new Error('There can only have one "e" in the value string.');
				valueString = valueSplitted[0];
				scientificNotationPart = valueSplitted[1];
			}

			let valueSplitted = valueString.split('.');
			if (valueSplitted.length > 2) throw new Error('There can only have one "." in the value string.');
			this.value = BigInt(valueSplitted[0] + (valueSplitted.length == 2 ? valueSplitted[1].split('').splice(0, floatDigits).join('').padEnd(floatDigits, '0') : new Array(floatDigits).fill('0').join('')));

			if (scientificNotation) {
				let shiftDigits = parseInt(scientificNotationPart);
				this.value = Flong.shiftBigInt(this.value, shiftDigits);
			}
		}
	}
	get length() {
		let valueString = this.value.toString();
		if (valueString.length == 1 && valueString[0] == '0') {
			return 0;
		}
		if (valueString[0] == '1') {
			let valueStringSplitted = valueString.split('');
			valueStringSplitted.shift();
			if (valueStringSplitted.filter(c => c !== '0').length == 0) {
				return valueString.length - 1;
			}
		}
		return valueString.length;
	}
	toString() {
		let value = this.value;

		let sign = value >= 0;
		if (!sign) value = -this.value;

		let valueStringSplitted = value.toString().padStart(this.floatDigits, '0').split('');
		valueStringSplitted.splice(valueStringSplitted.length - this.floatDigits, 0, '.');
		let lastDigitIsZero = true;
		while (lastDigitIsZero && valueStringSplitted.length > 0) {
			if (valueStringSplitted[valueStringSplitted.length - 1] == '0') {
				valueStringSplitted.pop();
			} else {
				lastDigitIsZero = false;
			}
		}
		let valueString = valueStringSplitted.join('');
		if (valueString[0] == '.') valueString = '0' + valueString;
		if (valueString[valueString.length - 1] == '.') valueString = valueString.replace('.', '');

		if (!sign) valueString = '-' + valueString;
		return valueString;
	}
	static shiftBigInt(value, shiftDigits) {
		if (shiftDigits > 0) {
			return value * 10n ** BigInt(shiftDigits);
		} else if (shiftDigits < 0) {
			return value / 10n ** BigInt(-shiftDigits);
		}
		return value;
	}
	static add(a, b) {
		let newFloatDigits = Math.max(a.floatDigits, b.floatDigits);
		let r = new this({ floatDigits: a.floatDigits });
		r.value = Flong.shiftBigInt(a.value, newFloatDigits - a.floatDigits) + Flong.shiftBigInt(b.value, newFloatDigits - b.floatDigits);
		return r;
	}
	static sub(a, b) {
		let newFloatDigits = Math.max(a.floatDigits, b.floatDigits);
		let r = new this({ floatDigits: a.floatDigits });
		r.value = Flong.shiftBigInt(a.value, newFloatDigits - a.floatDigits) - Flong.shiftBigInt(b.value, newFloatDigits - b.floatDigits);
		return r;
	}
	static mul(a, b) {
		let oriFloatDigits = a.floatDigits + b.floatDigits;
		let newFloatDigits = Math.max(a.floatDigits, b.floatDigits);

		let r = new this({ floatDigits: newFloatDigits });
		r.value = Flong.shiftBigInt(a.value * b.value, newFloatDigits - oriFloatDigits);
		return r;
	}
	static div(a, b) {
		let r = new this({ floatDigits: a.floatDigits });
		r.value = Flong.shiftBigInt(a.value, b.floatDigits) / b.value;
		return r;
	}
}

function f(x, y) {
	return Flong.add(
		Flong.sub(
			Flong.sub(
				Flong.mul(x, x),
				Flong.mul(y, y)
			),
			new Flong({ valueString: '9e-9' })
		),
		Flong.mul(
			new Flong({ valueString: '9e-8' }),
			x
		)
	)
}
function fx(x, y) {
	return Flong.add(
		Flong.mul(new Flong({ valueString: '2' }), x),
		new Flong({ valueString: '9e-8' })
	)
}
function fy(x, y) {
	return Flong.mul(new Flong({ valueString: '-2' }), y);
}
function g(x, y) {
	return Flong.add(
		Flong.add(
			Flong.add(
				Flong.mul(x, y),
				Flong.mul(Flong.sub(new Flong({ valueString: '1e-1' }), new Flong({ valueString: '1e-7' })), x)
			),
			Flong.mul(Flong.add(new Flong({ valueString: '1e-1' }), new Flong({ valueString: '1e-7' })), y)
		),
		Flong.mul(y, y)
	)
}
function gx(x, y) {
	return Flong.add(
		y,
		Flong.sub(new Flong({ valueString: '1e-1' }), new Flong({ valueString: '1e-7' }))
	)
}
function gy(x, y) {
	return Flong.add(
		Flong.add(
			x,
			Flong.add(new Flong({ valueString: '1e-1' }), new Flong({ valueString: '1e-7' }))
		),
		Flong.mul(new Flong({ valueString: '2' }), y)
	)
}
function phi(x, y) {
	let denominator =
		Flong.sub(
			Flong.mul(fx(x, y), gy(x, y)),
			Flong.mul(gx(x, y), fy(x, y))
		);
	return [
		Flong.sub(
			x,
			Flong.div(
				Flong.sub(
					Flong.mul(f(x, y), gy(x, y)),
					Flong.mul(g(x, y), fy(x, y))
				),
				denominator
			)
		),
		Flong.sub(
			y,
			Flong.div(
				Flong.sub(
					Flong.mul(g(x, y), fx(x, y)),
					Flong.mul(f(x, y), gx(x, y))
				),
				denominator
			)
		)
	];
}

let x = new Flong({ valueString: '9e-8' });
let y = new Flong({ valueString: '1e-17' });
console.log(x.toString(), y.toString());
let lastX = '', lastY = ''
for (let i = 0; i < 300; i++) {
	[x, y] = phi(x, y);
	let [thisX, thisY] = [x.toString(), y.toString()];
	if(thisX == lastX && thisY == lastY) break;
	console.log(thisX, thisY);
	[lastX, lastY] = [thisX, thisY];
}