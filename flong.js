/* 
 * MaoHuPi (c) 2024
 * flong.js
 * handle long float with specify float digits
 */

class Flong {
	static ZERO = new this({ valueString: '0' });
	static ONE = new this({ valueString: '1' });
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
		if (a.type == 'partial' || b.type == 'partial') {
			return {
				type: 'partial',
				function: () => this.add(a.function ? a.function() : a, b.function ? b.function() : b),
				derivative: () => this.add(a.derivative ? a.derivative() : Flong.ZERO, b.derivative ? b.derivative() : Flong.ZERO)
			};
		} else {
			let newFloatDigits = Math.max(a.floatDigits, b.floatDigits);
			let r = new this({ floatDigits: a.floatDigits });
			r.value = Flong.shiftBigInt(a.value, newFloatDigits - a.floatDigits) + Flong.shiftBigInt(b.value, newFloatDigits - b.floatDigits);
			return r;
		}
	}
	static sub(a, b) {
		if (a.type == 'partial' || b.type == 'partial') {
			return {
				type: 'partial',
				function: () => this.sub(a.function ? a.function() : a, b.function ? b.function() : b),
				derivative: () => this.sub(a.derivative ? a.derivative() : Flong.ZERO, b.derivative ? b.derivative() : Flong.ZERO)
			};
		} else {
			let newFloatDigits = Math.max(a.floatDigits, b.floatDigits);
			let r = new this({ floatDigits: a.floatDigits });
			r.value = Flong.shiftBigInt(a.value, newFloatDigits - a.floatDigits) - Flong.shiftBigInt(b.value, newFloatDigits - b.floatDigits);
			return r;
		}
	}
	static mul(a, b) {
		if (a.type == 'partial' || b.type == 'partial') {
			return {
				type: 'partial',
				function: () => this.mul(a.function ? a.function() : a, b.function ? b.function() : b),
				derivative: () => this.add(this.mul(a.derivative ? a.derivative() : Flong.ZERO, b.function ? b.function() : b), this.mul(a.function ? a.function() : a, b.derivative ? b.derivative() : Flong.ZERO))
			};
		} else {
			let oriFloatDigits = a.floatDigits + b.floatDigits;
			let newFloatDigits = Math.max(a.floatDigits, b.floatDigits);

			let r = new this({ floatDigits: newFloatDigits });
			r.value = Flong.shiftBigInt(a.value * b.value, newFloatDigits - oriFloatDigits);
			return r;
		}
	}
	static div(a, b) {
		if (a.type == 'partial' || b.type == 'partial') {
			return {
				type: 'partial',
				function: () => this.div(a.function ? a.function() : a, b.function ? b.function() : b),
				derivative: () => this.div(this.sub(this.mul(a.derivative ? a.derivative() : Flong.ZERO, b.function ? b.function() : b), this.mul(a.function ? a.function() : a, b.derivative ? b.derivative() : Flong.ZERO)), this.mul(b.function ? b.function() : b, b.function ? b.function() : b))
			};
		} else {
			let r = new this({ floatDigits: a.floatDigits });
			r.value = Flong.shiftBigInt(a.value, b.floatDigits) / b.value;
			return r;
		}
	}
	static det(matrix) {
		if (matrix.length !== matrix[0].length) {
			throw new Error('Can\'t calculate the determinant of the given matrix, which have different value between rows numbers and columns\'.');
		} else {
			if (matrix.length == 1) {
				return matrix[0][0];
			} else if (matrix.length == 2) {
				return this.sub(
					this.mul(matrix[0][0], matrix[1][1]),
					this.mul(matrix[1][0], matrix[0][1])
				);
			} else if (matrix.length > 2) {
				let sum = this.ZERO;
				let i = 1;
				for (let j = 1; j <= matrix.length; j++) {
					let M = matrix.map((row => row.map(value => value)));
					M.splice(i - 1, 1);
					M.map(row => row.splice(j - 1, 1));
					sum = this.add(
						sum,
						this.mul(
							this.mul(
								new Flong({ valueString: ((-1) ** (i + j)).toString() }),
								matrix[i - 1][j - 1]
							),
							this.det(M)
						)
					);
				}
				return sum;
			}
		}
	}
}

class NumericalAnalysis {
	static newtonsMethod1D({ f, x0 }) {
		let xValue = Flong.ZERO, getX = () => xValue;
		let
			_fPrime = f(
				{ type: 'partial', function: getX, derivative: () => Flong.ONE }
			).derivative,
			fPrime = (x) => {
				xValue = x;
				return _fPrime();
			};
		function phi(x) {
			return Flong.sub(
				x,
				Flong.div(
					f(x),
					fPrime(x)
				)
			);
		}
		let x = x0;
		// console.log(x.toString());
		let lastX = '';
		for (let i = 0; i < 100; i++) {
			x = phi(x);
			let thisX = x.toString();
			if (thisX == lastX) break;
			// console.log(thisX);
			lastX = thisX;
		}
		return x;
	}
	static newtonsMethod2D({ f, g, x0, y0 }) {
		let xValue = Flong.ZERO, getX = () => xValue,
			yValue = Flong.ZERO, getY = () => yValue;
		let
			_fx = f(
				{ type: 'partial', function: getX, derivative: () => Flong.ONE },
				{ type: 'partial', function: getY, derivative: () => Flong.ZERO }
			).derivative,
			_fy = f(
				{ type: 'partial', function: getX, derivative: () => Flong.ZERO },
				{ type: 'partial', function: getY, derivative: () => Flong.ONE }
			).derivative,
			_gx = g(
				{ type: 'partial', function: getX, derivative: () => Flong.ONE },
				{ type: 'partial', function: getY, derivative: () => Flong.ZERO }
			).derivative,
			_gy = g(
				{ type: 'partial', function: getX, derivative: () => Flong.ZERO },
				{ type: 'partial', function: getY, derivative: () => Flong.ONE }
			).derivative;
		let
			fx = (x, y) => {
				xValue = x;
				yValue = y;
				return _fx();
			},
			fy = (x, y) => {
				xValue = x;
				yValue = y;
				return _fy();
			},
			gx = (x, y) => {
				xValue = x;
				yValue = y;
				return _gx();
			},
			gy = (x, y) => {
				xValue = x;
				yValue = y;
				return _gy();
			};
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
		let x = x0;
		let y = y0;
		// console.log(x.toString(), y.toString());
		let lastX = '', lastY = ''
		for (let i = 0; i < 100; i++) {
			[x, y] = phi(x, y);
			let [thisX, thisY] = [x.toString(), y.toString()];
			if (thisX == lastX && thisY == lastY) break;
			// console.log(thisX, thisY);
			[lastX, lastY] = [thisX, thisY];
		}
		return [x, y];
	}
	static newtonsMethodND({ functions, initialValues }) {
		if (functions.length !== initialValues.length) {
			throw new Error('The function amount and initial value\'s must be the same. ');
		}
		let xiValue = initialValues.map(() => Flong.ZERO),
			getXi = xiValue.map((_, i) => (() => xiValue[i])),
			_fiXj = functions.map((f, i) => initialValues.map((x, j) => {
				return functions[i](
					...initialValues.map((y, k) => ({
						type: 'partial',
						function: getXi[k],
						derivative: () => k == j ? Flong.ONE : Flong.ZERO
					}))
				).derivative;
			})),
			fiXj = functions.map((f, i) => initialValues.map((x, j) => {
				return (...parameters) => {
					parameters.map((value, k) => xiValue[k] = value);
					return _fiXj[i][j]();
				};
			}));

		function phi(...parameters) {
			let denominator = Flong.det(functions.map((f, i) => initialValues.map((x, j) => {
				return fiXj[i][j](...parameters);
			})));
			return initialValues.map((_, k) => {
				return Flong.sub(
					parameters[k], 
					Flong.div(
						Flong.det(functions.map((f, i) => initialValues.map((x, j) => {
							return k == j ? functions[i](...parameters) : fiXj[i][j](...parameters);
						}))),
						denominator
					)
				);
			});
		}
		let xi = [...initialValues];
		let lastValues = initialValues.map(() => '');
		for (let i = 0; i < 100; i++) {
			xi = phi(...xi);
			let currentValues = xi.map(n => n.toString());
			if (currentValues.filter((n, j) => !(n == lastValues[j])).length == 0) break;
			lastValues = currentValues;
		}
		return xi;
	}
}

let tableExample = [
	['type', 'H2S', 'HS-', 'S2-', 'H+'  , 'OH-' , 'NaOH', 'Na+', 'H2O', '(K)'    ], 
	['init', '0.1', ''   , '0.1', '1e-7', '1e-7', ''    , ''   , '1'  , ''       ], 
	['Vb'  , ''   , ''   , ''   , ''    , ''    , '0.1' , ''   , '1'  , ''       ], 
	['x1'  , ''   , ''   , ''   , '1'   , '1'   , ''    , ''   , '-1' , '1.8e-16'], 
	['x2'  , '-1' , '1'  , ''   , '1'   , ''    , ''    , ''   , ''   , '9e-8'   ], 
	['x3'  , ''   , '-1' , '1'  , '1'   , ''    , ''    , ''   , ''   , '1e-17'  ], 
	['x4'  , ''   , ''   , ''   , ''    , '1'   , '-1'  , '1'  , ''   , '3'      ], 
];
function tableTest(table) {
	// let L = new Flong({ valueString: '1' });
	// let K_a1 = new Flong({ valueString: '9e-8' });
	// let K_a2 = new Flong({ valueString: '1e-17' });
	// let n_H2S = new Flong({ valueString: '0.1' });
	// let n_S2n = new Flong({ valueString: '0.1' });
	// function f(x1, x2) {
	// 	return Flong.sub(
	// 		Flong.mul(
	// 			Flong.add(Flong.add(x1, x2), x),
	// 			Flong.sub(x1, x2)
	// 		),
	// 		Flong.mul(
	// 			Flong.sub(n_H2S, x1),
	// 			Flong.mul(L, K_a1)
	// 		)
	// 	);
	// }
	// function g(x1, x2) {
	// 	return Flong.sub(
	// 		Flong.mul(
	// 			Flong.add(Flong.add(x1, x2), x),
	// 			Flong.add(n_S2n, x2)
	// 		),
	// 		Flong.mul(
	// 			Flong.sub(x1, x2),
	// 			Flong.mul(L, K_a2)
	// 		)
	// 	);
	// }
	// let [x1, x2] = NumericalAnalysis.newtonsMethodND({
	// 	functions: [f, g],
	// 	initialValues: [new Flong({ valueString: '100' }), new Flong({ valueString: '100' })],
	// });
	// return Flong.div(
	// 	Flong.add(Flong.add(x1, x2), x),
	// 	L
	// );
}
tableTest(tableExample);

// function f(x, y) {
// 	return Flong.add(
// 		Flong.sub(
// 			Flong.sub(
// 				Flong.mul(x, x),
// 				Flong.mul(y, y)
// 			),
// 			new Flong({ valueString: '9e-9' })
// 		),
// 		Flong.mul(
// 			new Flong({ valueString: '9e-8' }),
// 			x
// 		)
// 	);
// }
// function fx(x, y) {
// 	return Flong.add(
// 		Flong.mul(new Flong({ valueString: '2' }), x),
// 		new Flong({ valueString: '9e-8' })
// 	);
// }
// function fy(x, y) {
// 	return Flong.mul(new Flong({ valueString: '-2' }), y);
// }
// function g(x, y) {
// 	return Flong.add(
// 		Flong.add(
// 			Flong.add(
// 				Flong.mul(x, y),
// 				Flong.mul(Flong.sub(new Flong({ valueString: '1e-1' }), new Flong({ valueString: '1e-7' })), x)
// 			),
// 			Flong.mul(Flong.add(new Flong({ valueString: '1e-1' }), new Flong({ valueString: '1e-7' })), y)
// 		),
// 		Flong.mul(y, y)
// 	);
// }
// function gx(x, y) {
// 	return Flong.add(
// 		y,
// 		Flong.sub(new Flong({ valueString: '1e-1' }), new Flong({ valueString: '1e-7' }))
// 	);
// }
// function gy(x, y) {
// 	return Flong.add(
// 		Flong.add(
// 			x,
// 			Flong.add(new Flong({ valueString: '1e-1' }), new Flong({ valueString: '1e-7' }))
// 		),
// 		Flong.mul(new Flong({ valueString: '2' }), y)
// 	);
// }
// console.log(...NumericalAnalysis.newtonsMethod2D({
// 	f, fx, fy, 
// 	g, gx, gy, 
// 	x0: new Flong({ valueString: '9e-8' }), 
// 	y0: new Flong({ valueString: '1e-17' })
// }).map(n => n.toString()));

function getH_H2S_mix_HSn(x) {
	let L = new Flong({ valueString: '1' });
	let K_a1 = new Flong({ valueString: '9e-8' });
	let n_H2S = new Flong({ valueString: '0.1' });
	let n_HSn = new Flong({ valueString: '0.1' });
	function f(x1) {
		return Flong.sub(
			Flong.mul(
				Flong.add(x1, x),
				Flong.add(n_HSn, x1)
			),
			Flong.mul(
				Flong.sub(n_H2S, x1),
				Flong.mul(L, K_a1)
			)
		);
	}
	let x1 = NumericalAnalysis.newtonsMethod1D({
		f: f,
		x0: new Flong({ valueString: '1' })
	});
	return Flong.div(
		Flong.add(x1, x),
		L
	);
}

function getH_H2S_mix_S2n(x) {
	let L = new Flong({ valueString: '1' });
	let K_a1 = new Flong({ valueString: '9e-8' });
	let K_a2 = new Flong({ valueString: '1e-17' });
	let n_H2S = new Flong({ valueString: '0.1' });
	let n_S2n = new Flong({ valueString: '0.1' });
	function f(x1, x2) {
		return Flong.sub(
			Flong.mul(
				Flong.add(Flong.add(x1, x2), x),
				Flong.sub(x1, x2)
			),
			Flong.mul(
				Flong.sub(n_H2S, x1),
				Flong.mul(L, K_a1)
			)
		);
	}
	function g(x1, x2) {
		return Flong.sub(
			Flong.mul(
				Flong.add(Flong.add(x1, x2), x),
				Flong.add(n_S2n, x2)
			),
			Flong.mul(
				Flong.sub(x1, x2),
				Flong.mul(L, K_a2)
			)
		);
	}
	let [x1, x2] = NumericalAnalysis.newtonsMethod2D({
		f: f, g: g,
		x0: new Flong({ valueString: '100' }),
		y0: new Flong({ valueString: '100' })
	});
	// let [x1, x2] = NumericalAnalysis.newtonsMethodND({
	// 	functions: [f, g],
	// 	initialValues: [new Flong({ valueString: '100' }), new Flong({ valueString: '100' })],
	// });
	return Flong.div(
		Flong.add(Flong.add(x1, x2), x),
		L
	);
}

function getH_H2O(x) {
	let L = new Flong({ valueString: '1' });
	let K_w = new Flong({ valueString: '1e-14' });
	let n_H2O = new Flong({ valueString: '0.1' });
	function f(x1) {
		return Flong.sub(
			Flong.mul(
				Flong.add(x1, x),
				x1
			),
			Flong.mul(
				Flong.sub(n_H2O, x1),
				Flong.mul(L, K_w)
			)
		);
	}
	let x1 = NumericalAnalysis.newtonsMethod1D({
		f: f,
		x0: new Flong({ valueString: '1' })
	});
	return Flong.div(
		Flong.add(x1, x),
		L
	);
}

let getH = getH_H2S_mix_S2n;
let list = [];
for (let i = 0; i < 1000; i++) {
	list.push([(i / 1000).toString(), getH(new Flong({ valueString: (i / 1000).toString() })).toString()]);
}

// neg velue count
// console.log(list.filter(([x, H]) => H[0] == '-').length)

// [H+]
// console.log(list.map(([x, H]) => `${x}\t${H}\n`).join(''));

// pH
console.log(list.map(([x, H]) => [x, (parseFloat(H) >= 0 ? (-Math.log10(parseFloat(H))) : (14 + Math.log10(-parseFloat(H)))).toString()]).map(([x, H]) => `${x}\t${H}\n`).join(''));

// p function
// console.log(new Array(100).fill(0).map((n, i) => [i/100, i/100]).map(([x, H]) => [x, (parseFloat(H) >= 0 ? (-Math.log10(parseFloat(H))) : (14 + Math.log10(-parseFloat(H)))).toString()]).map(([x, H]) => `${x}\t${H}\n`).join(''));

// derivative test
// let a = Flong.ZERO, getA = () => a;
// let b = Flong.ZERO; getB = () => b;
// function test(x, y) {
// 	return Flong.div(Flong.add(Flong.mul(new Flong({valueString: '5'}), Flong.mul(x, x)), Flong.mul(x, Flong.mul(y, y))), Flong.add(Flong.mul(x, x), Flong.mul(y, y)));
// }
// a = new Flong({ valueString: '20' });
// b = new Flong({ valueString: '5' });
// console.log(test({ type: 'partial', function: getA, derivative: () => Flong.ZERO }, { type: 'partial', function: getB, derivative: () => Flong.ONE }).derivative().toString())

// let A = Flong.det([
// 	[new Flong({ valueString: '-2' }), new Flong({ valueString: '-1' }), new Flong({ valueString: '2' })],
// 	[new Flong({ valueString: '2' }), new Flong({ valueString: '1' }), new Flong({ valueString: '4' })],
// 	[new Flong({ valueString: '-3' }), new Flong({ valueString: '3' }), new Flong({ valueString: '-1' })],
// ])
// console.log(A.toString());