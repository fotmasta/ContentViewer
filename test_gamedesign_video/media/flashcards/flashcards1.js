define({
	cards: [
		{
			"chapters": [1],
			"term": "term",
			"definition": "Definition goes here."
		},
		{
		"chapters": [1, 2],
		"term": "adjacent-layer interaction",
		"definition": "The general topic of how on one computer, two adjacent layers in a networking architectural model work together, with the lower layer providing services to the higher layer."
	}, {
		"chapters": [1],
		"term": "de-encapsulation",
		"definition": "On a computer that receives data over a network, the process in which the device interprets the lower-layer headers and, when finished with each header, removes the header, revealing the next-higher-layer PDU."
	}, {
		"chapters": [1],
		"term": "encapsulation",
		"definition": "The placement of data from a higher-layer protocol behind the header (and in some cases, between a header and trailer) of the next-lower-layer protocol. For example, an IP packet could be encapsulated in an Ethernet header and trailer before being sent over an Ethernet."
	}, {
		"chapters": [1],
		"term": "frame",
		"definition": "A term referring to a data link header and trailer, plus the data encapsulated between the header and trailer."
	}, {
		"chapters": [2],
		"term": "networking model",
		"definition": "A generic term referring to any set of protocols and standards collected into a comprehensive grouping that, when followed by the devices in a network, allows all the devices to communicate. Examples include TCP/IP and OSI."
	}, {
		"chapters": [3],
		"term": "packet",
		"definition": "A logical grouping of bytes that includes the network layer header and encapsulated data, but specifically does not include any headers and trailers below the network layer."
	}]
});