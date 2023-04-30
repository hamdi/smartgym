let req_res;

function addRows(nb, name, pts) {
  var table = document.getElementById( 'lbTable' ),
      row = table.insertRow(),
      cell1 = row.insertCell(0),
      cell2 = row.insertCell(1),
      cell3 = row.insertCell(2);

  cell1.innerHTML = '' + nb;
  cell1.classList.add("number");
  cell2.innerHTML = name;
  cell2.classList.add("name");
  cell3.innerHTML = pts;
  cell3.classList.add("points");
}

var promise1 = new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest(),
      method = "GET",
      url = "https://f2r1su6iai.execute-api.eu-west-1.amazonaws.com/deploy";
    xhr.open(method, url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      }
    };
    xhr.send();
  });

  promise1.then(function(value) {
    req_res = JSON.parse(value.body);
    //console.log(JSON.parse(req_res));
    let nb1name = document.getElementById('nb1name');
    nb1name.innerHTML = req_res[0][0];
    let nb1pts = document.getElementById('nb1pts');
    nb1pts.innerHTML = req_res[0][1];
    for (let i = 1; i < req_res.length; i++) {
      addRows(i+1, req_res[i][0], req_res[i][1]);
    }
  });

