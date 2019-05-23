var APP_ROOT = "http://epsilon-it.utu.fi/flask_shelve_r";
var collection = "roosa-annotations";
var doc_count = 100

var choices = {
	"Narrative":
		["Narrative general",
			"News reports / News blogs",
			"Sports reports",
			"Personal blog",
			"Historical article",
			"Fiction",
			"Travel blog",
			"Community blog",
			"Online article"],
	"Informational Description (or Explanation)":
		["Informational Description general",
			"Description of a thing",
			"Encyclopedia articles",
			"Research articles",
			"Description of a person",
			"Information blogs",
			"FAQs",
			"Course materials",
			"Legal terms / conditions",
			"Report"],
	"Opinion":
		["Opinion general",
			"Reviews",
			"Personal opinion blogs",
			"Religious blogs/sermons",
			"Advice"],
	"Interactive discussion":
		["Interactive discussion general",
			"Discussion forums",
			"Question-Answer forums"],
	"How-To":
		["How-to/instructions",
			"Recipes"],
	"Informational Persuasion":
		["Informational Persuasion general",
			"Description with intent to sell",
			"News+Opinion blogs / Editorials"],
	"Lyrical":
		["Songs",
			"Poems"],
	"Spoken":
		["Interviews",
			"Formal speeches",
			"TV transcripts"],
	"Other":
		["Machine-translated / generated texts"]
};

//custom dropdown component
Vue.component('dropdown', {
	template: "<select v-model='dropdown_value' v-on:change='selected'> \
		<option value=''>Ei valintaa</option> \
    <optgroup v-for='item, key in data' v-bind:label='key'> \
      <option v-for='option in item' v-bind:value='option'>{{option}}</option> \
    </optgroup> \
	</select>",

	props: ["data", "index", "category_index", "oldValue", "bodyurl", "textid", "docid", "doctext"],
	data: function () {
		return {
			dropdown_value: "",
		}
	},
	created: function () {
		if (this.oldValue) {
			this.dropdown_value = this.oldValue["register-" + this.category_index];
		}
	},
	methods: {
		//prompts an update to flask_shelve every time an option is selected from the dropdown
		selected: function () {
			console.log(this.dropdown_value);
			this.$emit("data", {
				key: "register-" + this.category_index,
				value: this.dropdown_value,
				header: this.index,
				bodyurl: this.bodyurl,
				docid: this.docid,
				doctext: this.doctext
			});
		}
	}
});

//Custom button

Vue.component('my-button', {
	template: '\
    <button class="normal"\
      :disabled="disabled"\
      @click="goback()"\
      >\
        <slot></slot>\
    </button>\
  ',
	props: {
		type: String,
		disabled: Boolean
	},
	methods: {
		callback: function (e) {
			this.$emit('click', e);
		},
		goback: function () {
			console.log("called");
			app.active_page = 1;
		}
	}
});

//Custom checkbox
Vue.component('custom-checkbox', {
	template: "<input v-model='checked' v-on:change='selected' type='checkbox'> \
</input>",
	props: ["index", "oldValue", "id", "index", "bodyurl"],
	data: function () {
		return {
			checked: false
		}
	},
	created: function () {
		if (this.oldValue) {
			this.checked = this.oldValue[this.id];
		}
	},
	methods: {
		selected: function () {
			console.log(this.checked);
			this.$emit("data", {
				key: this.id,
				value: this.checked,
				header: this.index,
				bodyurl: this.bodyurl

			});
		}
	}
});


var app = new Vue({
	el: "#app",
	methods: {
		//HANDLEDATA
		//passes the data from dropdowns or checkboxes to the save function
		handleData: function (data) {
			console.log(data.header, data.key, data.value, data.bodyurl, data.docid, data.doctext)
			this.save(data.header, data.key, data.value, data.bodyurl, data.docid, data.doctext);
		},
		//CHECK USER
		//check if the user types in a name
		annotateSet: function () {
			if (!this.username) {
				return;
			}
			this.fetchTexts();
			//fetch the user's previous texts from the server, if they exist
			//this.$http.get(APP_ROOT + "/" + collection + "/" + this.username).then(response => {
			this.$http.get("http://localhost:5000/get/annotationsmay2019/" + this.username).then(response => {
				console.log('Response body:');
				console.log(response.body);
				if (response.body === null) {
					console.log("No annotations found");
				} else {
					console.log("Texts found");
					this.values = response.body;
					if (this.textsfetched == 0) {
						this.textsfetched = 1;
					} else {
						this.textsfetched = 0;
					}
				}
			}, response => {
				alert("Server error")
			});
			this.toggleTextsFetched();
			this.active_page = 2;
		},
		//SAVE
		//creates a JS object for the annotation and keeps it in the user's list values
		save: function (id, key, value, bodyurl, docid, doctext) {
			if (!this.values[id]) {
				this.values[id] = {}
				this.values[id]['id'] = id
				this.values[id]['url'] = bodyurl
				this.values[id]['text'] = doctext
				this.values[id]['doc_id'] = docid
			}

			if (value === '' || value === false) {
				delete this.values[id][key];
			}
			else {
				this.values[id][key] = value
			}

			console.log(this.values[id][key]);

			this.saveToServer(id)
		},
		//SAVETOSERVER
		//send the JSON formatted data to the flask_shelve
		saveToServer: function (id) {

			var jsonobject = encodeURIComponent(JSON.stringify(this.values[id]));
			//this.$http.post(APP_ROOT + "/set/" + collection + "/" + this.username + "/" + id, {
			this.$http.post("http://localhost:5000/set/annotationsmay2019/" + this.username + "/" + id, {
				value: jsonobject
			}).then(function (data) {
				console.log('Returned:');
				console.log(data);
			});

		},
		fetchTexts: function () {
			this.texts = []
			/*
				fetches the documents from server
				File names assumed to be comments_i
				NOTE: The texts are in JSON-files. Some files have only one text, but there are
				also files with several texts.
				The code below reads all the JSON entities from a
				file, so you need to check the amount of texts in the file you want to use.
				If there are files that have only one text, then the for loop above
				needs to run until the wanted amount of texts is retrieved. For example, if you want 100 texts
				and you have SEVERAL FILES with only ONE text, the loop needs
				to run 100 times to fetch the 100 documents. If, on the other hand, there is ONE file with 77 texts
				and you need to retrieve only that one file, make the loop run only once.
				EXAMPLES:
				1) I have 100 JSON files named comments_0, comments_2, ... comments_99. I want to
				display them all on the website. The for loop above looks like this:
				for (let i = 0; i < 100; i++). That way all the texts are fetched.
				2) I have one JSON file named comments_100, which includes 77 texts. I need to
				fetch only this one file, so the for loop looks like this:
				for (let i = 0; i < 101; i++).
				(You can also skip the for loop altogether, but this way modifying the code is easy... probably)
	      this.$http.get("documents/comments_" + i + ".json").then(response => {
					*/
			for (let i = 1002; i < 1003; i++) {
				this.$http.get("PB-10k-docs6/comments_" + i + ".json").then(response => {
					if (response.body) {
						console.log("Fetched texts:")
						console.log(response.body)
						for (var key in response.body) {
							this.texts.push({
								index: i,
								body: response.body[key],
								text_id: response.body[key].id,
								doc_id: response.body[key].doc_id,
								text_url: response.body[key].url
							})
						}
					}
				}, (err) => {
					console.log("Error with file comments_", i);
				});
			}
			this.toggleTextsFetched();
		},
		fetchUnclearTexts: function () {
			if (!this.username) {
				return;
			}
			// if the values array already has texts, the unclear values can be retrieved from it instead of making a query
			//to the server
			if (this.values.length)
			this.texts = []
				this.$http.get("http://localhost:5000/get/annotationsmay2019/" + this.username + "/unclear").then(response => {
					if (response.body) {
						console.log("Unclear texts:")
						console.log(response.body)
						this.values = {}
						this.values = response.body;
						console.log("arvot");
						for (var key in this.values) {
							console.log(this.values[key]);
							this.texts.push({
								index: 1,
								body: response.body[key],
								text_id: response.body[key].id,
								doc_id: response.body[key].doc_id,
								text_url: response.body[key].url
							})
						}
					}
				}, (err) => {
					console.log("Error with file comments_", i);
				});
			this.toggleTextsFetched();
			this.active_page = 2;
		},
		finish: function () {
			this.active_page = 3;
		},
		toggleTextsFetched: function () {
			if (this.textsfetched == 0) {
				this.textsfetched = 1;
			} else {
				this.textsfetched = 0;
			}
		}
	},
	created: function () {
		//this.fetchTexts();
	},
	data: {
		choices: choices,
		texts: [],
		values: {},
		username: "",
		users: {},
		active_page: 1,
		unclear: false,
		comments: false,
		foreignlang: false,
		char: false,
		check_value: "",
		manycomments: "",
		textsfetched: 0,
		seen: false
	},
	events: {

	}
});