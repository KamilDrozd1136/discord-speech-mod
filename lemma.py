from flask import Flask, request, jsonify
import morfeusz2

app = Flask(__name__)
morf = morfeusz2.Morfeusz()

@app.route('/lemmatize', methods=['POST'])
def lemmatize():
    text = request.json.get('text', '')
    analysis = morf.analyse(text)
    lemmas = []

    for i, j, interp in analysis:
        lemma = interp[1]
        lemma = lemma.split(':')[0]
        if lemma not in lemmas:
            lemmas.append(lemma)

    return jsonify(lemmas)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)