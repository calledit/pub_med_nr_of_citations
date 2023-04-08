// ==UserScript==
// @name     Order by nr of citations
// @version  1
// @include  https://pubmed.ncbi.nlm.nih.gov/*
// @grant    GM.setValue
// @grant    GM.getValue
// @grant    GM.registerMenuCommand
// @grant    GM.xmlHttpRequest
// @grant    GM.deleteValue



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

async function get_pub_med_citations(pub_med_id, list_element, try_count){
  if(typeof(try_count) == 'undefined'){
  	try_count = 0;
  }
	var cached_html = await GM.getValue(pub_med_id, false);
  var citations_url = "https://pubmed.ncbi.nlm.nih.gov/?linkname=pubmed_pubmed_citedin&from_uid="+pub_med_id;
  //console.log(citations_url);
  if(!cached_html){
    GM.xmlHttpRequest({
      method: "GET",
      url: citations_url,
      onload: function(response) {
        if(response.finalUrl != citations_url){
        	console.log("was redirected from:", citations_url, response)
          if(try_count < 3){
          	setTimeout(function(){
            	get_pub_med_citations(pub_med_id, list_element, try_count + 1);
          	},1000);
          }else{
          	render_nr_of_citaions(list_element, "PubMed could not return nr of citations");
          }
        }else{
          var got_proper_citations = deal_with_citaions(list_element, response.responseText);
          if(got_proper_citations){
        		GM.setValue(pub_med_id, response.responseText);
          }
        	
        }
      }
    });
  }else{
  	deal_with_citaions(list_element, cached_html);
  }
}
const search_nr_str = '<span class="value">'; 
function deal_with_citaions(list_element, html){
  var ret = true;
  var res_count = html.search(search_nr_str)
  var mid = html.substring(res_count+search_nr_str.length);
  var nr_of_citations_str = mid.substring(0, mid.search('<'));
  nr_of_citations = Number(nr_of_citations_str.replace(/[^\d.-]+/g, ''));
  if(Number.isNaN(nr_of_citations) || res_count == -1){
  	nr_of_citations = "Failed to get citation count";
    console.log(nr_of_citations_str);
    ret = false;
  }
  render_nr_of_citaions(list_element, nr_of_citations);
  return(ret);
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
