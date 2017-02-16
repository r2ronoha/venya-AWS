import os
from flask import Flask, render_template
import subprocess

app = Flask(__name__)
app.config['DEBUG'] = True

nodeserver = "venya-node-server"
serverport = 8888

@app.route('/', defaults={'path':'init.html'})
@app.route('/<path:path>')
def catch_all(path):
	#cmd = ["getent","hosts",nodeserver]
	#p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.PIPE)
	#out,err = p.communicate()
	#serverip = out.split()[0].decode()
	#return render_template(path, serverip=serverip, serverport=serverport)
	return render_template(path)

if __name__ == "__main__":
	app.run(host="0.0.0.0")
