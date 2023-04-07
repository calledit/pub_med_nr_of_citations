// ==UserScript==
// @name     Order by nr of citations
// @version  1
// @include  https://pubmed.ncbi.nlm.nih.gov/*
// @grant    GM.setValue
// @grant    GM.getValue
// @grant    GM.registerMenuCommand
// @grant    GM.xmlHttpRequest

// ==/UserScript==

var observeDOM = (function(){
  var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

  return function( obj, callback ){
    if( !obj || obj.nodeType !== 1 ) return; 

    if( MutationObserver ){
      // define a new observer
      var mutationObserver = new MutationObserver(callback)

      // have the observer observe for changes in children
      mutationObserver.observe( obj, { childList:true, subtree:true })
      return mutationObserver
    }
    
    // browser support fallback
    else if( window.addEventListener ){
      obj.addEventListener('DOMNodeInserted', callback, false)
      obj.addEventListener('DOMNodeRemoved', callback, false)
    }
  }
})()

async function get_pub_med_citations(pub_med_id, list_element){
	var cached_html = await GM.getValue(pub_med_id, false);
  var citations_url = "https://pubmed.ncbi.nlm.nih.gov/?linkname=pubmed_pubmed_citedin&from_uid="+pub_med_id;
  //console.log(citations_url);
  if(!cached_html){
    GM.xmlHttpRequest({
      method: "GET",
      url: citations_url,
      onload: function(response) {
        GM.setValue(pub_med_id, response.responseText);
        deal_with_citaions(list_element, response.responseText)
      }
    });
  }else{
  	deal_with_citaions(list_element, cached_html);
  }
}
const search_nr_str = '<span class="value">'; 
function deal_with_citaions(list_element, html){
  
  var mid = html.substring(html.search(search_nr_str)+search_nr_str.length);
  var nr_of_citations = mid.substring(0, mid.search('<'));
  
  render_nr_of_citaions(list_element, nr_of_citations)
}

function render_nr_of_citaions(list_element, nr_of_citations){
  
  list_element.innerHTML = '<span style="background-color: coral;">'+nr_of_citations+"</span> "+list_element.innerHTML
  //console.log(list_element, nr)
}
var observer = false;
var refcontainer;

function parse_dom_references(m){
  if(observer){
  	observer.disconnect();
    observer = false;
	}
  var pubmed_ref_links = refcontainer.querySelectorAll(".reference-link[href^='/']");
  for(var x=0;x<pubmed_ref_links.length;x++){
    var list_element = pubmed_ref_links[x].parentNode;
  	var pub_med_id = pubmed_ref_links[x].getAttribute('data-ga-action');
    get_pub_med_citations(pub_med_id, list_element);
  }
}

function get_citations(){
	console.log("Getting citations")
  
  //Get self citations
  var own_pubmed_id = document.querySelector(".current-id").innerHTML;
  get_pub_med_citations(own_pubmed_id, document.querySelector(".heading-title"));
  
  //Get citations for references
  refcontainer = document.querySelector(".refs-list");
  if(!refcontainer){
  	return false;
  }
  var show_all_button = document.querySelector(".show-all:not(.disabled)");
  if(show_all_button){
  	observer = observeDOM( refcontainer, parse_dom_references);
  	show_all_button.click();
  }else{
    parse_dom_references();
  }

}

GM.registerMenuCommand("Get citations", get_citations);
