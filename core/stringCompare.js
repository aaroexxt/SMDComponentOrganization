/*
Two algorithms from research:
- ratcliff-oberhelp is pattern matching, meaning it looks for commonalities in the data
- levenshtein looks for edit distance, or character changes between two strings

I think pattern matching is the better approach because we want to recognize that over edit distance, i.e. for
ATMEGA328P vs ATMEGA1284P, it would do a better job of filtering in this niche case

Credit to: https://github.com/GitSage/gestalt-pattern-matcher
and https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely
*/

const ratcliffObershelp = function(s1, s2)
{
    var stack = [];
    stack.push(s1);
    stack.push(s2);
    
    var score = 0;
    
    while(stack.length != 0) {
        var string1 = stack.pop();
        var string2 = stack.pop();
        
        // log.debug("Comparing substrings ", string1, " and ", string2);
        
        var longestSequenceLength = 0;
        var longestSequenceIndex1 = -1;
        var longestSequenceIndex2 = -1;
        for(var i = 0; i < string1.length; i++) {
            for(var j = 0; j < string2.length; j++) {
                var k = 0;
                while(i+k < string1.length && j+k < string2.length && string1.charAt(i+k) === string2.charAt(j+k)) {
                    k++;
                }
                if(k > longestSequenceLength) {
                    longestSequenceLength = k;
                    longestSequenceIndex1 = i;
                    longestSequenceIndex2 = j;
                    // log.debug("New longest match found: " + string1.substring(i, i+k));
                }
            }
        }
    
        if(longestSequenceLength === 0) {
            // log.debug("Strings have no similar characters.");
        } else {
            score += longestSequenceLength * 2;
            if(longestSequenceIndex1 !== 0 && longestSequenceIndex2 !== 0) {
                // log.debug("Pushing " + string1.substring(0, longestSequenceIndex1));
                // log.debug("Pushing " + string2.substring(0, longestSequenceIndex2));
                stack.push(string1.substring(0, longestSequenceIndex1));
                stack.push(string2.substring(0, longestSequenceIndex2));
            }
            if(longestSequenceIndex1 + longestSequenceLength !== string1.length && 
                longestSequenceIndex2 + longestSequenceLength !== string2.length) {
                // log.debug("Pushing " + string1.substring(longestSequenceIndex1 + longestSequenceLength, string1.length));
                // log.debug("Pushing " + string2.substring(longestSequenceIndex2 + longestSequenceLength, string2.length));
                stack.push(string1.substring(longestSequenceIndex1 + longestSequenceLength, string1.length));
                stack.push(string2.substring(longestSequenceIndex2 + longestSequenceLength, string2.length));
            }
        }
        // log.debug("Current score: " + score);
    }
    // log.info("Score for " + s1 + ", " + s2 + ": " + score / (s1.length + s2.length));
    return score / (s1.length + s2.length);
}

function levenshtein(s1, s2) {
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

module.exports = {
    levenshtein: levenshtein,
    ratcliffObershelp: ratcliffObershelp
}