const searchInject = `
<div class="search-root">
	<form class="search-form">
		<input class="search-text" placeholder="Search Wikipedia" type="text" />
		<input type="submit" class="search-btn" />
	</form>


	<div class="search-container">
	<a class="search-close">[X]</a>
	<div class="search-results"></div>
	</div>

	<div id="entry-proto" style="display: none;">
		<div class="entry">
			<span class="entry-id"></span>
			<a class="entry-link"></a>
		</div>
	</div>

	<style>
		.search-root {
			margin-left: 60%;
		}
		.search-form {
			position: relative;
		}
		.search-text {
			width: 100%;
		}
		.search-container {
			position: relative;
		}
		.search-close {
			display: none;
			position: absolute;
			top: 0;
			right: 0;
		}
		.search-btn {
			position: absolute;
			top: 0;
			right: 0;
			margin: 0;
			padding: 0;
			border: 0;
			width: 1.65em;
			height: 100%;
			background-image: url("../I/s/search-ltr.png");
			background-color: transparent;
			background-position: center center;
			background-repeat: no-repeat;
			text-indent: -99999px;
			overflow: hidden;
			direction: ltr;
			white-space: nowrap;
			cursor: pointer;
		}

		.entry-id {
			display: none;
		}	
	</style>
</div>
`
var script = document.createElement('script');
var wikiSearch = null;
script.src = "../-/j/search.js";
script.onload = () => {
	wikiSearch = new WikiSearch('{{SEARCH_CID}}');
}

document.head.appendChild(script);

var anch = document.querySelector('#top');

var div = document.createElement('div');
div.innerHTML = searchInject;
anch.parentNode.insertBefore(div.firstElementChild, anch.nextSibling);

var closeBtn = document.querySelector('.search-close')

closeBtn.onclick = function() {
	delResults();
	closeBtn.style.display = "none";
};


var delResults = function() {
		var resultsElem = document.querySelector('.search-results');
		while(resultsElem.firstChild) resultsElem.removeChild(resultsElem.firstChild);
}


document.querySelector('.search-form').onsubmit = function() {
	if (wikiSearch == null) {
		return false;
	}
	var val = document.querySelector('.search-text').value;
	wikiSearch.search(val).then(function(results) {
		var proto = document.getElementById('entry-proto').children[0];
		var resultsElem = document.querySelector('.search-results');
		delResults()

		results.slice(0, 19).forEach(function(art, idx) {
			var entry = proto.cloneNode(true);
			entry.getElementsByClassName('entry-id')[0].appendChild(document.createTextNode(idx));
			var link = entry.getElementsByClassName('entry-link')[0];
			link.appendChild(document.createTextNode(art.replace(/_/g, " ").slice(0, -5)));
			link.href = art;
			closeBtn.style.display = "inherit";

			resultsElem.appendChild(entry);
		})

	});
	return false
};



