export interface CodeSample {
  id: string;
  name: string;
  language: string;
  code: string;
  description: string;
}

export const CODE_SAMPLES: CodeSample[] = [
  {
    id: 'py_counter',
    name: 'Python Counter',
    language: 'Python',
    description: 'Basic accumulator loop',
    code: `total = 0
for i in range(1, 6):
    total += i
print("Total:", total)`
  },
  {
    id: 'js_reverse',
    name: 'JS Reverse',
    language: 'JavaScript',
    description: 'Reverse string using loop',
    code: `let str = "code";
let reversed = "";
for (let i = str.length - 1; i >= 0; i--) {
    reversed += str[i];
}
console.log(reversed);`
  },
  {
    id: 'java_factorial',
    name: 'Java Factorial',
    language: 'Java',
    description: 'Calculate factorial in a loop',
    code: `public class Main {
    public static void main(String[] args) {
        int n = 5;
        int fact = 1;
        for (int i = 1; i <= n; i++) {
            fact *= i;
        }
    }
}`
  },
  {
    id: 'cpp_max',
    name: 'C++ Find Max',
    language: 'C++',
    description: 'Find maximum element in array',
    code: `#include <vector>

int main() {
    std::vector<int> nums = {4, 12, 7, 25, 3};
    int maxVal = nums[0];
    for (int n : nums) {
        if (n > maxVal) maxVal = n;
    }
    return 0;
}`
  }
];
