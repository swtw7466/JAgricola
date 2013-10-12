// ==UserScript==
// @name        JAgricola
// @namespace   JAgricola
// @description Agricola sites translates to Japanese.
// @include     http://www.boiteajeux.net/jeux/agr/partie.php*
// @version     2.0.2
// @require     http://code.jquery.com/jquery-1.8.2.js
// @require     https://raw.github.com/kswedberg/jquery-cluetip/master/jquery.cluetip.min.js
// @grant       hoge
// ==/UserScript==

(function() {

    // class
    var Action = function(round, player, action) {
        this.round = round;
        this.player = player;
        this.action = action;
    };

    // global variables
    var cardJson, agrid, drafting, draftWaiting, AUDIO_LIST, lastTurn, alerted;

    // constants
    var ajaxmsec = 10 * 1000;
    var draftMsg = "Choose the improvement and the occupation that you want to add to your hand and confirm.";
    var draftWaitingMsg = "Round #0";

    // main functions
    initialize();
    createCardSpace();
    createDraftCards();

    setAlert();
    if (!(draftWaiting || drafting)) {
        setCardTooltip($('#dvCartesPosees td.clCarteMf'));
        setCardTooltip($('#dvPanneauAmelioration div.clCarteMf'), { leftOffset: 670 + 345 });
        setCardTooltip($('#dvPanneauMain td.clCarteMf'), { leftOffset: 910 + 345 });
        hookShowExp();
        setAjaxHistory();
    }

    // sub functions
    function initialize() {
        cardJson = initializeCardJson();
        agrid = getAgricolaId();
        alerted = agrid + "_alerted";
        drafting = (document.body.innerHTML.match(draftMsg));
        draftWaiting = (document.body.innerHTML.match(draftWaitingMsg));
        lastTurn = 0;
        AUDIO_LIST = {
            "bell": new Audio("http://heaven.gunjobiyori.com/up1157.wav")
        };
    }

    function createCardSpace() {
        $("form[name=fmDraft]").before('<div id="active" />');
        if ($("form[name=fmMiniForum]").length == 0) {
            $("img[src*=cartesenjeu]").parent().next().append('<table id="history" border="0" cellpadding="1" cellspacing="1" width="250"><thead><th class="clEntete">Round</th><th class="clEntete">Player</th><th class="clEntete">Action</th></thead><tbody></tbody></table>');
        } else {
            $("form[name=fmMiniForum]").after('<table id="history" border="0" cellpadding="1" cellspacing="1" width="250"><thead><th class="clEntete">Round</th><th class="clEntete">Player</th><th class="clEntete">Action</th></thead><tbody></tbody></table>');
        }

        $('#conteneur').after('<div id="ja-texts" style="display:none"></div>');
        $('#ja-texts').append('\
<div id="ja-text-1" title="1. かまど"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionArgile16.png"></p>あなたはいつでも、作物や動物を以下の通り食料に換えられる。野菜:食料2、羊:食料2、猪:食料2、牛:食料3。「パンを焼く」のアクションでは、小麦1を食料2に換えられる。<br>*あなたは複数のかまどを所有できる。<br>*このカードで、動物や野菜を同時にいくらでも食料にできる。「パンを焼く」場合は、一度に小麦をいくつでも食料にできる。三つ足やかんの能力を起動するために、パンを焼くのと同時に他の品物を食料にしてもよい。<br>*アクションスペースから動物を入手した場合、それを牧場に入れるスペースがなくても、牧場に入れずにただちに食料に換えることができる。<br>*かまどは暖炉ではない。<br>*収穫の繁殖フェイズの間は、動物を食料に換えられない。最後の収穫の繁殖フェイズの後は、ただちにゲーム終了となるため、最後の繁殖フェイズで入手した動物を食料に換えることはできない。</div>\
<div id="ja-text-2" title="2. かまど"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionArgile16.png"></p>あなたはいつでも、作物や動物を以下の通り食料に換えられる。野菜:食料2、羊:食料2、猪:食料2、牛:食料3。「パンを焼く」のアクションでは、小麦1を食料2に換えられる。<br>*あなたは複数のかまどを所有できる。<br>*このカードで、動物や野菜を同時にいくらでも食料にできる。「パンを焼く」場合は、一度に小麦をいくつでも食料にできる。三つ足やかんの能力を起動するために、パンを焼くのと同時に他の品物を食料にしてもよい。<br>*アクションスペースから動物を入手した場合、それを牧場に入れるスペースがなくても、牧場に入れずにただちに食料に換えることができる。<br>*かまどは暖炉ではない。<br>*収穫の繁殖フェイズの間は、動物を食料に換えられない。最後の収穫の繁殖フェイズの後は、ただちにゲーム終了となるため、最後の繁殖フェイズで入手した動物を食料に換えることはできない。</div>\
<div id="ja-text-3" title="3. 調理場"><p style="font-style:italic">コスト: 4x<img align="absmiddle" src="img/pionArgile16.png"> または かまどを返す</p>あなたはいつでも、作物や動物を以下の通り食料に換えられる。野菜:食料3、羊:食料2、猪:食料3、牛:食料4。「パンを焼く」のアクションでは、小麦1を食料3に換えられる。<br>*大きい進歩のかまどをアップグレードする場合、元のかまどは大きい進歩置き場に返す。小さい進歩の簡易かまどをアップグレードする場合、元の簡易かまどはゲームから取り除く。<br>*あなたは、複数個の調理場を所有できる。<br>*このカードで、動物や野菜を同時にいくらでも食料にできる。「パンを焼く」場合は、一度に小麦をいくつでも食料にできる。三つ足やかんの能力を起動するために、パンを焼くのと同時に他の品物を食料にしてもよい。<br>*調理場は暖炉ではない。<br>*アクションスペースから動物を入手した場合、それを牧場に入れるスペースがなくても、牧場に入れずにただちに食料に換えることができる。<br>*収穫の繁殖フェイズの間は、動物を食料に換えられない。最後の収穫の繁殖フェイズの後は、ただちにゲーム終了となるため、最後の繁殖フェイズで入手した動物を食料に換えることはできない。</div>\
<div id="ja-text-4" title="4. 調理場"><p style="font-style:italic">コスト: 5x<img align="absmiddle" src="img/pionArgile16.png"> または かまどを返す</p>あなたはいつでも、作物や動物を以下の通り食料に換えられる。野菜:食料3、羊:食料2、猪:食料3、牛:食料4。「パンを焼く」のアクションでは、小麦1を食料3に換えられる。<br>*大きい進歩のかまどをアップグレードする場合、元のかまどは大きい進歩置き場に返す。小さい進歩の簡易かまどをアップグレードする場合、元の簡易かまどはゲームから取り除く。<br>*あなたは、複数個の調理場を所有できる。<br>*このカードで、動物や野菜を同時にいくらでも食料にできる。「パンを焼く」場合は、一度に小麦をいくつでも食料にできる。三つ足やかんの能力を起動するために、パンを焼くのと同時に他の品物を食料にしてもよい。<br>*調理場は暖炉ではない。<br>*アクションスペースから動物を入手した場合、それを牧場に入れるスペースがなくても、牧場に入れずにただちに食料に換えることができる。<br>*収穫の繁殖フェイズの間は、動物を食料に換えられない。最後の収穫の繁殖フェイズの後は、ただちにゲーム終了となるため、最後の繁殖フェイズで入手した動物を食料に換えることはできない。</div>\
<div id="ja-text-5" title="5. レンガ暖炉"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionArgile16.png">1x<img align="absmiddle" src="img/pionPierre16.png"></p>「パンを焼く」のアクションのたびに、小麦最大1を食料5にできる。このカードの獲得のとき、追加のアクションで「パンを焼く」ができる。<br>*このカードを出したときに行うパンを焼くアクションでは、すでに出されている他の進歩でパンを焼いても良い。</div>\
<div id="ja-text-6" title="6. 石の暖炉"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionArgile16.png">3x<img align="absmiddle" src="img/pionPierre16.png"></p>「パンを焼く」のアクションで、小麦最大2をそれぞれ食料4に換えられる。このカードをプレイしたとき、「パンを焼く」のアクションができる。<br>*石の暖炉をプレイしたとき、他のパンを焼ける進歩をすでにプレイしていれば、それを使ってパンを焼いても良い。</div>\
<div id="ja-text-7" title="7. 製陶所"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionArgile16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫のたび、あなたは製陶所を使ってレンガ最大1を食料2にできる。ゲーム終了時、レンガ3/5/7でボーナス点1/2/3を得る。</div>\
<div id="ja-text-8" title="8. 家具製作所"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫のたびに木材最大1を食料2にできる。ゲーム終了時に木材3/5/7でそれぞれ1/2/3点のボーナスを得る。<br>*ゲーム終了時、雑木林と林務官の上にある木材はボーナス計算に数える。 骨細工 と資材商人 の上にある木材はゲーム終了時のボーナス計算には数えない。</div>\
<div id="ja-text-9" title="9. かご製作所"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionRoseau16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫のたびに葦最大1を食料3にできる。ゲーム終了時に葦2/4/5でそれぞれ1/2/3点のボーナスを得る。</div>\
<div id="ja-text-10" title="10. 井戸"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png">3x<img align="absmiddle" src="img/pionPierre16.png"></p>これ以降の5ラウンドのスペースに食糧1を置く。これらのラウンドの開始時に、それらの食糧を得る。</div>\
<div id="ja-text-11" title="11. 畑"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionPN16.png"></p>このカードをプレイすると、ただちに畑を1つ耕す。このカードはプレイ後、左隣のプレイヤーの手札に入る。<br>*このカードをプレイするときに、鋤類および馬鍬の能力は使えない。</div>\
<div id="ja-text-12" title="12. 釣竿"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>「漁」のアクションスペースを使うたび、食料1を追加で得る。ラウンド8以降は、食料2を追加で得る。</div>\
<div id="ja-text-13" title="13. 斧"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png">1x<img align="absmiddle" src="img/pionPierre16.png"></p>木の家の増築は木材2と葦2でできる。<br>*1回の増築で複数個の部屋を作る場合、斧の効果はそれぞれの部屋に適用してよい。<br>*斧と大工の両方をプレイしている場合、増築する1つの部屋に対して両方のカードの効果を適用することはできない。1回で2部屋以上増築する場合、あなたはそれぞれの部屋に対してどちらのカードの効果を適用するか選べる。<br>*斧の効果を適用後、さらにレンガの屋根、はしご、わら小屋、柴屋根、屋根がけ、柴結び、彫刻家によって増築コストを下げることができる。</div>\
<div id="ja-text-14" title="14. パン焼き暖炉"><p style="font-style:italic">コスト: なし<br>条件: 暖炉を返す</p>「パンを焼く」のアクションのたびに、小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」アクションができる。<br>*暖炉1枚を返却する。レンガ暖炉と石の暖炉は大きい進歩置き場へ戻す。木の暖炉はゲームから取り除く。<br>*このカードを出したときに行うパンを焼くアクションでは、すでに出されている他の進歩でパンを焼いても良い。</div>\
<div id="ja-text-15" title="15. パン焼き桶"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>レンガ暖炉と石の暖炉が小さい進歩になり好きな資材1つ分安くなる。木の暖炉も資材1つ分安くなる。</div>\
<div id="ja-text-16" title="16. 建築資材"><p style="font-style:italic">コスト: なし</p>このカードを出したらすぐ木材１かレンガ1を得る。このカードはプレイ後、左隣のプレイヤーの手札に入る。</div>\
<div id="ja-text-17" title="17. 風車小屋"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png">1x<img align="absmiddle" src="img/pionPierre16.png"></p>あなたはいつでも、小麦2を食糧2に換えられる（これは「パンを焼く」ではない）。<br>*風車小屋の使用は「パンを焼く」ではない。</div>\
<div id="ja-text-18" title="18. マメ畑"><p style="font-style:italic">コスト: なし<br>条件: 2x職業</p>種まきで、このカードの上に畑と同じように野菜を植えられる。（このカードは得点計算で畑に含めない）<br>*マメ畑の上に種をまくとき、じゃがいも掘りや畑農の効果を適用し、追加の野菜を置いても良い。<br>*小農夫の効果で追加の野菜を置くことはできない。<br>*マメ畑の上に野菜マーカーがあるときは、薬草畑やイチゴ花壇の前提条件として数える。</div>\
<div id="ja-text-19" title="19. 三つ足やかん"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionArgile16.png"></p>かまど、調理場、調理コーナー（訳注：かまど印のアイコンがついた進歩）で2つの品物を食料に換えると、追加で食料1を得る。<br>*4つの品物を食料に換えると追加で食料2を、6つの品物なら追加で食料3をえる。以下同様。<br>*品物には、動物も含む。<br>*パンを焼く行為は、品物を食料に換えているとみなす。<br>*別々の種類の品物2つでも三つ足やかんの効果は発動する。また、異なる進歩を同じタイミングで使っても同様。（訳注：たとえば、暖炉でパンを1つ焼くのと同時にかまどで野菜を1つ煮た場合、三つ足やかんの効果が発動して追加食料1がもらえる。）</div>\
<div id="ja-text-20" title="20. 簡易かまど"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionArgile16.png"></p>あなたはいつでも、資材を以下の通り食料に換えられる。野菜:食料2、羊:食料1、猪:食料2、牛:食料3。「パンを焼く」のアクションでは、小麦1を食料2に換えられる。<br>*簡易かまどはかまどとして数える。例として、簡易かまどは調理場にアップグレードすることができる。また、簡易かまどをプレイしたときに炭焼きの効果が発動する。<br>*簡易かまどを調理場にアップグレードした場合、簡易かまどはゲームから取り除く。<br>*あなたは複数のかまどを所持できる。<br>*このカードで、動物や野菜を同時にいくらでも食料にできる。「パンを焼く」場合は、一度に小麦をいくつでも食料にできる。三つ足やかんの能力を起動するために、パンを焼くのと同時に他の品物を食料にしてもよい。<br>*簡易かまどは暖炉ではない。<br>*収穫の繁殖フェイズの間は、動物を食料に換えられない。最後の収穫の繁殖フェイズの後は、ただちにゲーム終了となるため、最後の繁殖フェイズで入手した動物を食料に換えることはできない。</div>\
<div id="ja-text-21" title="21. 木骨の小屋"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png">1x<img align="absmiddle" src="img/pionArgile16.png">1x<img align="absmiddle" src="img/pionRoseau16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>ゲーム終了時、あなたの石の家1部屋につきボーナス1点を得る。（これにより、合計すると石の家1部屋につき2点でなく3点を得ることになる。）（あなたがヴィラをプレイしていた場合、木骨の小屋のボーナス点は得られない。）<br>*家が石の家でなければ、何の効果もない。<br>*木骨の小屋のボーナス点は、族長のボーナス点とは別に得る。</div>\
<div id="ja-text-22" title="22. いかだ"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>「漁」のアクションスペースを使うたび、追加の葦1または食料1を得る。</div>\
<div id="ja-text-23" title="23. かいば桶"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>ゲーム終了時、牧場が占める農場スペースの数が6/7/8/9以上で1/2/3/4点を得る。<br>*ボーナス点は、農場内の柵で囲われたスペースの数で決まる。牧場がいくつあるかは関係ない。</div>\
<div id="ja-text-24" title="24. 檻"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 4x職業</p>これ以降のラウンドのスペース全部にそれぞれ食料2を置く。これらのラウンドのはじめにその食料を得る。</div>\
<div id="ja-text-25" title="25. スパイス"><p style="font-style:italic">コスト: なし</p>野菜をかまど、調理場、調理コーナーで食料に換えるたび、追加で食料1を得る。<br>*複数個の野菜を同時に食料に換えた場合、野菜1つごとに食料1を得る。</div>\
<div id="ja-text-26" title="26. かんな"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>家具製作所、製材所、家具職人で木材1を食料に換えるたび、食料1を追加で得る。または、追加で木材1を支払い、食料2を得ることを選べる。</div>\
<div id="ja-text-27" title="27. 木の暖炉"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png">1x<img align="absmiddle" src="img/pionPierre16.png"></p>「パンを焼く」のアクションのたびに、小麦をいくらでも1つにつき食料3にできる。このカードの獲得のとき、追加アクションで「パンを焼く」ができる。<br>*族長の娘を持っている場合、両方のカードで得点を得る。（訳注：おそらく「木のスリッパ」の補足説明です。個の段落は無視してよいでしょう）<br>*このカードをプレイするときの追加の「パンを焼く」アクションで、他の進歩カードを使ってパンを焼いても良い。</div>\
<div id="ja-text-28" title="28. 木のスリッパ"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>ゲーム終了時に、レンガの家ならボーナス1点、石の家ならボーナス2点を得る。<br>*木骨の小屋、ヴィラをプレイしていても、このカードのボーナス点（2点）は得られる。<br>*族長の娘をプレイしている場合は、両方のカードでボーナス点を得る。</div>\
<div id="ja-text-29" title="29. 角笛"><p style="font-style:italic">コスト: なし<br>条件: 1x<img align="absmiddle" src="img/pionMouton16.png"></p>羊がいる牧場は、羊の収容能力が2増える。柵で囲われていない厩に、羊を2頭まで飼える。<br>*厩作りをプレイしている場合、角笛は柵で囲われていない厩（ただし、厩作りの効果が適用されているもの）に対しては効果を発揮しない。<br>*角笛の効果によって、家畜庭、動物園の収容能力も増加する。</div>\
<div id="ja-text-30" title="30. カヌー"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2x職業</p>「漁」のアクションスペースを使うたびに、追加で食料1と葦1を得る。</div>\
<div id="ja-text-31" title="31. 鯉の池"><p style="font-style:italic">コスト: なし<br>条件: 1x職業 かつ 2x進歩</p>これ以降の奇数ラウンドのスペースに、それぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。<br>*前提条件の進歩、職業は、あなたの前に置かれている進歩、職業のみをカウントする。</div>\
<div id="ja-text-32" title="32. じゃがいも掘り"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>あなたは畑に野菜を植えるたび、それらの畑に追加の野菜1を置く。<br>*追加の野菜は、マメ畑、カブ畑、レタス畑にも置かれる。</div>\
<div id="ja-text-33" title="33. 陶器"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionArgile16.png"><br>条件: 「暖炉」</p>このカードを出すとすぐに食料2を得る。今後、製陶所は（あなたにとって）小さい進歩になり、コストなしで作れる。</div>\
<div id="ja-text-34" title="34. かご"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionRoseau16.png"></p>アクションスペースから木材を取るアクションのたびに、木材2をそのスペースに残して食料3を得ることができる。<br>*アクションスペースにある木材が1つ以下の場合、かごの能力を使うことはできない。<br>*キノコ探しをプレイしている場合、この能力とあわせて木材3を残せば食料5を得る。<br>*このカードの能力は、アクション1回につき1度しか使えない。（訳注：木材を4つ残して食料6を得ることはできない。）</div>\
<div id="ja-text-35" title="35. 穀物スコップ"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>「小麦1を取る」のアクションスペースを使うたびに、追加の小麦1を得る。</div>\
<div id="ja-text-36" title="36. レンガの屋根"><p style="font-style:italic">コスト: なし<br>条件: 1x職業</p>増築か改築をするとき、葦1または2を同数のレンガで代用できる。<br>*増築のとき、葦2の代わりに葦1とレンガ1としてもよい。<br>*レンガの屋根と同時に、増築や改築のコストを変更するカードを組み合わせても良い。これらのカードは、レンガの屋根の効果で支払うレンガに対しても作用する。たとえば、レンガの屋根と梁打ちを組み合わせると、木の家の増築は木材6でよい。<br>*1回の増築で複数個の部屋を作る場合、それぞれの部屋についてレンガの屋根の効果を適用できる。</div>\
<div id="ja-text-37" title="37. レンガの柱"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>レンガの家を増築するたびに、レンガ5と葦2をレンガ2と木材1と葦1で代用できる。<br>*レンガ積みや大工をプレイしている場合、これら3つのカードの効果を同時には使用できない。1回で2部屋以上を増築するとき、それぞれの部屋についてレンガ積み、大工、レンガの柱のどれを適用するか選べる。<br>*レンガの柱の効果を適用した後、さらにレンガの屋根、はしご、わら小屋、柴屋根、屋根がけ、梁打ち、柴結びの効果を重ねて適用してもよい。</div>\
<div id="ja-text-38" title="38. 聖マリア像"><p style="font-style:italic">コスト: なし</p>聖マリア像は何の効果ももたない。（あなたは、手札の進歩ではなく、すでにプレイして目の前に置いてある進歩2つを捨てなければならない。捨てた進歩は、あなたのものではなくなるため無価値となる。）<br>*捨てられた進歩が今後のラウンドであなたにもたらすはずだった効果（資材、食料など）は失われる。<br>*大きい進歩を捨てた場合、大きい進歩置き場に戻す。小さい進歩を捨てた場合、ゲームから取り除く。</div>\
<div id="ja-text-39" title="39. 露店"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionCereale16.png"></p>このカードをプレイするとすぐに野菜1を得る。このカードはプレイ後、左隣のプレイヤーの手札に入る。<br>*カードをプレイするコストとして支払う小麦は、畑ではなく自分のストックから出すこと。<br>*露天商の女をプレイしている場合は、効果が発動する。出来高労働者は何も起こらない。<br>*自分のストックに小麦がない場合、露店をプレイできない。もちろん、露天商の女の効果も発動しない。</div>\
<div id="ja-text-40" title="40. 小牧場"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionPN16.png"></p>このカードをプレイしたら、すぐに農場の1スペースを柵で囲って牧場にする。このカードはプレイ後、左隣のプレイヤーの手札に入る。（柵の分の木材は支払わなくて良い）<br>*柵のルールには従うこと。すでに牧場がある場合は、 新しく作る牧場は、すでに存在する牧場につなげる必要がある。 柵管理人などでこの手番にさらに柵を作る場合、手番の終了時にのみ、牧場が正しく作られているかチェックする。<br>*柵管理人、農場主、厩番、家畜飼いをプレイしている場合、それらの能力が発動する。<br>*小牧場で囲うスペースは、もともと柵で囲われていないスペースであること。柵で囲われていない厩については、小牧場の効果で囲ってもよい。</div>\
<div id="ja-text-41" title="41. 石臼"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionPierre16.png"></p>あなたは小麦を1つ以上パンにするたびに、追加で食料2を得る。<br>*パン職人と一緒に使った場合、収穫でパンを焼くたびに追加の食料2を得る。<br>*暖炉、かまど、調理場、調理コーナー、パン焼き部屋、パン焼き小屋を使って小麦を食料に換えた場合、石臼の効果が発動する。<br>*「種をまく そして パンを焼く」のアクションスペースを使い、パンを焼かなかった場合は石臼の効果は発動しない。（訳注：原文の another player uses は you use の誤り。）<br>*醸造所、火酒製造所、火酒作り、水車、風車小屋、手引き臼といったカードで小麦を食料に換える行為は「パンを焼く」ではない。</div>\
<div id="ja-text-42" title="42. 親切な隣人"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"> or 1x<img align="absmiddle" src="img/pionArgile16.png"></p>このカードを出すとすぐに石材1か葦1を得る。このカードはプレイ後、左隣のプレイヤーの手札に入る。</div>\
<div id="ja-text-43" title="43. 果物の木"><p style="font-style:italic">コスト: なし<br>条件: 3x職業</p>ラウンド8から14の、まだ始まっていないラウンドの各スペースに食料1を置く。各ラウンドの開始時に、これらの食料を取る。<br>*現在のラウンドおよび、すでに終わっているラウンドの食料は得られない。</div>\
<div id="ja-text-44" title="44. 離れのトイレ"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png">1x<img align="absmiddle" src="img/pionArgile16.png"></p>離れのトイレは何の効果もない。他のプレイヤーの中に職業が2つ未満の人がいる場合に、このカードを出せる。（あなたがプレイした職業の数とは無関係である。）<br>*ソリテアゲームの場合は、あなたがプレイした職業が2つ未満の場合に離れのトイレを出せる。</div>\
<div id="ja-text-45" title="45. 個人の森"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionPN16.png"></p>これ以降の偶数ラウンドのスペースに木材1を置く。これらのラウンドの開始時に、その木材を得る。</div>\
<div id="ja-text-46" title="46. 荷車"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2x職業</p>（訳注：まだ始まっていない）ラウンド5、8、11、14のスペースに小麦1を置く。これらのラウンドの開始時に、それらの小麦を得る。<br>*現在のラウンドおよびすでに終わったラウンドの小麦は手に入らない。</div>\
<div id="ja-text-47" title="47. レタス畑"><p style="font-style:italic">コスト: なし<br>条件: 3x職業</p>このカードの上に、畑に植えるのと同じようにして野菜を植えられる。この畑の野菜は、収穫のとき食料4に換えられる。（このカードは得点計算のとき畑に含めない。）<br>*収穫した野菜を食料4にするためには、野菜を収穫後すぐに食料に換えなければならない。（訳注：いったん手元のストックに置く選択をしたなら、レタス畑の能力で食料4にする機会は失われる。）<br>*レタス畑の上に野菜マーカーがあるとき、薬草畑やイチゴ花壇の前提条件に数える。<br>*レタス畑の効果で野菜を食料に換える行為では、スパイスの能力は発動しない。</div>\
<div id="ja-text-48" title="48. 葦の池"><p style="font-style:italic">コスト: なし<br>条件: 3x職業</p>これ以降の3ラウンドのスペースにそれぞれ葦1を置く。これらのラウンドの開始時に、それらの葦を得る。</div>\
<div id="ja-text-49" title="49. 書き机"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2x職業</p>「職業」のアクションを行うとき、続けて別の職業を出せる。2つめの職業を出す場合には、食糧2を支払うこと。<br>*1つめの職業を出すときのコストは通常通り。<br>*本棚およびパトロンを出している場合、あなたは書き机の効果で2枚目の職業を出すときも食糧を受け取る。<br>*5人ゲームの「職業1または家族を増やす」のアクションスペースで「家族を増やす」のアクションを選んだ場合は、書き机の能力は起動しない。</div>\
<div id="ja-text-50" title="50. へら"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>「改築」のアクションなしに、木の家をいつでもレンガの家に改築できる。（資材は支払う）<br>*あるアクションの実行中にへらの効果で改築をすることはできない。たとえば、ある（改築でない）アクション中に、Stump-Jump Plowのような進歩の効果を得るために、へらでレンガの家に改築をするなど。<br>*修理屋とへらの効果を同時に適用して、アクションなしで木の家を石の家にすることはできない。</div>\
<div id="ja-text-51" title="51. 糸巻き棒"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>あなたは収穫の畑フェイズで、羊3/5匹を飼っていれば追加で食料1/2を得る。</div>\
<div id="ja-text-52" title="52. 厩"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>このカードをプレイするとすぐに、厩1を建てる。（厩のコストは支払わなくて良いが、このカードをプレイするためのコストは支払う）。このカードはプレイ後、左隣のプレイヤーの手札に入る。</div>\
<div id="ja-text-53" title="53. 撹乳器"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>収穫で畑フェイズのたびに羊がいれば羊3匹につき食料1を得る。同じく牛がいれば牛2匹につき食料1を得る。</div>\
<div id="ja-text-54" title="54. 石切り場"><p style="font-style:italic">コスト: なし<br>条件: 4x職業</p>「日雇い労働者」のアクションスペースを使うたび、石材3を追加で得る。</div>\
<div id="ja-text-55" title="55. 石の家増築"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionRoseau16.png">3x<img align="absmiddle" src="img/pionPierre16.png"></p>このカードをプレイしたらすぐに、石の家を1部屋増築する。（増築のコストは支払わなくて良いが、このカードをプレイするためのコストは支払う。）このカードはプレイ後、左隣のプレイヤーの手札に入る。<br>*柴屋根、レンガの屋根、はしご、わら小屋、柴結び、梁打ち、屋根がけのカードによってこのカードをプレイするためのコストを変更できる。</div>\
<div id="ja-text-56" title="56. 石ばさみ"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>ステージ2とステージ4で登場する「石材」のアクションスペースを使うたび、追加で石材1を得る。</div>\
<div id="ja-text-57" title="57. ハト小屋"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionPierre16.png"></p>ラウンド10から14までの（訳注：まだ始まっていないラウンドの）各スペースに食料1を置く。それらのラウンドの開始時に、その食料を得る。<br>*現在のラウンドおよび、すでに終わっているラウンドの食料は得られない。</div>\
<div id="ja-text-58" title="58. 家畜庭"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1x職業</p>このカードの上に好きな動物を2頭置ける。種類が異なっていても良い。（このカードは得点計算で牧場に含めない）<br>*このカードを出したときに、ストックから動物を受け取れるわけではない。<br>*角笛や水飲み場の効果によって、家畜庭の収容能力は増加する。</div>\
<div id="ja-text-59" title="59. 水飲み場"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>厩の有無に関わらず、自分の牧場は全て家畜が2頭多く入るようになる。<br>*柵で囲われていない厩の収容能力は増えない。<br>*家畜庭、動物園の収容能力は増加する。</div>\
<div id="ja-text-60" title="60. 家畜市場"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionMouton16.png"></p>このカードを出したらすぐ牛1を得る。このカードはプレイ後、左隣のプレイヤーの手札に入る。<br>*手に入れた牛は、ただちにかまど、調理場、調理コーナー、精肉屋、肉屋で食料に変えても良い。</div>\
<div id="ja-text-61" title="61. 鋤車"><p style="font-style:italic">コスト: 4x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 3x職業</p>ゲーム中に2回、「畑1を耕す」または「畑を耕して種をまく」のアクションで耕せる畑が、畑1でなく畑3になる。<br>*畑3の代わりに畑2を耕しても良い。<br>*残り使用回数を示すために、畑タイル2つをこのカードの上に置いても良い。<br>*畑を耕すアクションスペースを使うとき、5種類の鋤類および馬鍬のどれか1つしか使えない。</div>\
<div id="ja-text-62" title="62. 折り返し鋤"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2x職業</p>ゲーム中に1回、あなたは「畑1を耕す」または「畑1を耕す そして/または 種をまく」のアクションスペースを使うとき、畑1の代わりに畑3を耕しても良い。<br>*あなたは、畑3の代わりに畑2を耕すことを選んでも良い。<br>*あなたは、プレイした折り返し鋤の上に畑タイル1枚を置くことができる。これは、折り返し鋤の効果があと1回使えることを示す。<br>*畑を耕すアクションスペースを使うとき、あなたは5種類の鋤類および馬鍬のうちどれか1つしか使えない。</div>\
<div id="ja-text-63" title="63. 突き鋤"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1x職業</p>ゲーム中に2回、あなたは「畑1を耕す」のアクションで畑1のかわりに畑2を耕せる。「畑を耕して種をまく」のアクションでは使えない。<br>*このカードの上に畑タイルを2枚置き、突き鋤が残り2回使えることを表してもよい。<br>*「畑1を耕す」のアクションスペースを使うとき、5種類の鋤類と馬鍬を使う場合は1回につきどれか1つしか使えない。</div>\
<div id="ja-text-64" title="64. 喜捨"><p style="font-style:italic">コスト: なし</p>このカードを出した時点で、既に終わっているラウンド数だけ食料を得る。このカードはプレイ後、左隣のプレイヤーの手札に入る。<br>*現在のラウンドは、「終わっているラウンド」とはみなさない。現在のラウンドの最後のアクションで喜捨がプレイされたとしても、同様である。</div>\
<div id="ja-text-65" title="65. パン焼き部屋"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionPierre16.png"><br>条件: 暖炉を返す</p>「パンを焼く」のアクションのたびに小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」のアクションができる。<br>*パン焼き部屋は暖炉ではない。 パン焼き小屋へのアップグレードはできない。<br>*このカードを出したときに行うパンを焼くアクションでは、すでに出されている他の進歩でパンを焼いても良い。</div>\
<div id="ja-text-66" title="66. 村の井戸"><p style="font-style:italic">コスト: なし<br>条件: 井戸を返す</p>これ以降の3ラウンドのスペースに食糧1を置く。これらのラウンドの開始時に、あなたはその食糧を得る。<br>*大きい進歩の井戸が大きい進歩置き場に戻った後、村の井戸の所有者が再び井戸を買うことができる。<br>*井戸は5ラウンドにわたり1食糧ずつを供給する。村の井戸をプレイしたとき、これらの食糧はそのままにしてさらに3ラウンド分の食糧を追加で置く。これに加えてさらに井戸を再度プレイしたときは、さらに追加で（5ラウンド分の）食糧を置く。</div>\
<div id="ja-text-67" title="67. 脱穀そり"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2x職業</p>あなたが「畑1を耕す」または「畑1を耕す そして/または 種をまく」のアクションを使うたび、同時に「パンを焼く」のアクションもできる。</div>\
<div id="ja-text-68" title="68. 馬鍬"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>ゲーム中に1回だけ、「畑1を耕す」か「畑を耕して種をまく」のアクションで耕せる畑が1つから2つになる。他の人もゲーム中に1回だけ、あなたに食料2を払って同じことができる。<br>*他のプレイヤーは、畑を耕すアクションスペースを使った場合に、一度だけ馬鍬を使ってもよい。<br>*馬鍬は他の5つの鋤類と組み合わせて使うことはできない。<br>*あなたは他のプレイヤーが馬鍬を使うことを拒否できない。</div>\
<div id="ja-text-69" title="69. イチゴ花壇"><p style="font-style:italic">コスト: なし<br>条件: 2 Vegetable field(s)</p>これ以降の3ラウンドの各スペースに、それぞれ食料1を置く。これらのラウンドの開始時に、その食料を得る。<br>*野菜畑は、野菜マーカーが1つ以上置かれている畑のことをいう。収穫済みの空の畑は野菜畑ではない。<br>*マメ畑、レタス畑、カブ畑はイチゴ花壇の前提条件になりうる。ただし、野菜マーカーが1つ以上置かれていること。<br>*Seed Trader、小売人、Giant Pumpkin、Pumpkin Seed Oil は前提条件には数えない。</div>\
<div id="ja-text-70" title="70. 地固め機"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>他のプレイヤーが鋤類か馬鍬を使ったとき、あなたも畑1を耕せる。（鋤類、馬鍬を自分で使った場合はこの効果は得られない。）<br>*（鋤類、馬鍬を持つ）他のプレイヤーが畑を1つしか耕さなかった場合、あなたは地固め機の効果を得られない。</div>\
<div id="ja-text-71" title="71. 別荘"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png">2x<img align="absmiddle" src="img/pionRoseau16.png"> or 3x<img align="absmiddle" src="img/pionArgile16.png">2x<img align="absmiddle" src="img/pionRoseau16.png"></p>ラウンド14で家族（ゲストを含む）を一切使えない。このカードはラウンド13までに出すこと。（収穫は2回連続で行う。）<br>*このカードのコストは木材3と葦2、もしくはレンガ3と葦2である。<br>*レンガの屋根、柴屋根、わら小屋は別荘をプレイするときには組み合わせられない。<br>*あなたは、ラウンド14の労働フェイズ（フェイズ3）に参加できないが、開始フェイズ（フェイズ1）は行う。<br>*別荘をプレイした場合、共同体長によるボーナス点は得られない。</div>\
<div id="ja-text-72" title="72. ガチョウ池"><p style="font-style:italic">コスト: なし<br>条件: 3x職業</p>これ以降4ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。</div>\
<div id="ja-text-73" title="73. ゲスト"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionPN16.png"></p>このカードを出すと、ゲストトークンを得る。ゲストは次のラウンドに家族と同じようにアクションスペースに置ける。このカードはプレイ後、左隣のプレイヤーの手札に入る。<br>*ゲストであることを示すために、権利マーカーを裏返し、ゲストトークンとして使う。このトークンは、家族コマと同じようにアクションスペースに置く。<br>*すでに家族が5人いる場合、次のラウンドであなたは6回のアクションができることになる。<br>*ゲストには家や部屋は不要である。<br>*ゲストのアクションは、共同体長の条件チェックに含める。<br>*ラウンド14にゲストがプレイされた場合、得点計算でゲストは家族としてはカウントしない。</div>\
<div id="ja-text-74" title="74. 小麦車"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2x職業</p>「小麦1を取る」のアクションスペースを使うたびに、追加で小麦2を得る。</div>\
<div id="ja-text-75" title="75. 手挽き臼"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫で食糧供給フェイズのたびに小麦1を食料2にするか、小麦2を食料4にできる。<br>*手挽き臼の使用は「パンを焼く」ではない。</div>\
<div id="ja-text-76" title="76. くまで"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>ゲーム終了時、あなたは5つ以上畑を耕していれば2点のボーナス点を得る。ただし、馬鍬、鋤類、地固め機、くびきをプレイしている場合は畑5つでなく6つ以上が必要。<br>*マメ畑、レタス畑、カブ畑、平地は畑として数えない。Scarecrow によって2つの山がある畑であっても、畑1として数える。<br>*くまでと鋤類 、馬鍬、地固め機、くびき をプレイし、その後聖マリア像のプレイング・コストとして鋤類のほうを捨てた場合、ゲーム終了時のチェックでは、捨てた鋤類はプレイされていなかったものとみなす。<br>*鋤類 、馬鍬、地固め機、くびきの中から複数枚をプレイしていた場合でも、必要な畑は6つでよい。</div>\
<div id="ja-text-77" title="77. 牧人の杖"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>4スペース以上を柵で囲って新たな牧場を作るたび、その牧場に羊2を置く。<br>*4スペース以上の牧場の数が増えない限り、すでにある4スペースより大きい牧場を分割して牧場を作った場合、それらは「新たな牧場」とはみなさない。</div>\
<div id="ja-text-78" title="78. 雑木林"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1x職業</p>種をまくとき、このカードの上に木材を最大2つまで植えられる。この木材は小麦と同じように扱い、収穫の畑フェイズで収穫する。（このカードは得点計算のとき畑として数えない。）<br>*種をまいて小麦が4つになるのであれば、雑木林の上に木材を植えた場合も同様に木材が4つになる。<br>*収穫フェイズのたびに、植えた木材の山1つにつき木材1を取る。<br>*このカードの上にある木材は、倉庫主の条件にはカウントしない。ゲーム終了時、家具製作所または製材所の条件にはカウントする。<br>*種をまくアクションのとき、（訳注：畑に小麦や野菜をまかずに）雑木林の上に木材を植えるだけとしてもよい。</div>\
<div id="ja-text-79" title="79. 木材荷車"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 3x職業</p>あなたは、アクションスペースから木材を取るたびに木材2を追加で得る。<br>*5人ゲームの「葦1石材1木材1」を使った場合は、能力は起動しない。</div>\
<div id="ja-text-80" title="80. 林"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 3x職業</p>他のプレイヤーが「木材3」のアクションスペースを使うとき、その中から木材1をあなたに渡す。（これは5人ゲームの「木材4」のアクションスペースでは効果がない。）<br>*あなたが木材1を他のプレイヤーに要求したとき、他のプレイヤーは実行するアクションを変更しても良い。</div>\
<div id="ja-text-81" title="81. 木の家増築"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionRoseau16.png">5x<img align="absmiddle" src="img/pionBois16.png"></p>このカードをプレイしたらすぐに、木の家を1部屋増築する。（増築のコストは支払わなくて良いが、このカードをプレイするためのコストは支払う。）<br>*あなたは柴屋根、レンガの屋根、はしご、わら小屋、柴結び、屋根がけの効果をこのカードのコストに適用できる。<br>*大工、斧の効果をこのカードのコストに適用できる。なお木の家増築のカードは通常の増築と比べて葦1つ分コストが安いが、その効果は失われることに注意。たとえば、大工の効果を適用した場合は葦が2つ必要になる。<br>*あなたが「家族を増やす」のアクションスペースを使うとき、先に進歩の効果を適用して家を増築し、その直後に増築したスペースに対して家族を増やすことはできない（あくまで「家族を増やす」が先）。</div>\
<div id="ja-text-82" title="82. 木のクレーン"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"></p>ステージ2または4で登場する「石材」のアクションスペースを使うたび、あなたは石材1を追加で得る。このとき食糧1を支払うと、石材1の代わりに石材2を追加で得る。<br>*他のアクションスペースから石材を取った場合は、能力は起動しない。</div>\
<div id="ja-text-83" title="83. 林道"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>もっとも価値の高い道を持つプレイヤーは2点のボーナス点を得る。（石材5の舗装道路、レンガ3のレンガ道はともに林道よりも価値が高い。）<br>*あなたが林道とそれ以外の道カードを同時にプレイしている場合、ボーナス点を重複して得ることはできない。（最も価値の高い道のボーナス点のみを得る。）</div>\
<div id="ja-text-84" title="84. 鶏小屋"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png">1x<img align="absmiddle" src="img/pionRoseau16.png"> or 2x<img align="absmiddle" src="img/pionArgile16.png">1x<img align="absmiddle" src="img/pionRoseau16.png"></p>これ以降の8ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。<br>*このカードは木材2と葦1、もしくはレンガ2と葦1で出すことができる。</div>\
<div id="ja-text-85" title="85. 調理コーナー"><p style="font-style:italic">コスト: なし<br>条件: 調理場を返す</p>あなたはいつでも、作物や動物を以下の通り食料に換えられる。野菜:食料4、羊:食料2、猪:食料3、牛:食料4。「パンを焼く」のアクションでは、小麦1を食料3に換えられる。<br>*大きい進歩の調理場をアップグレードする場合、元の調理場は大きい進歩置き場に返す。小さい進歩の調理場をアップグレードする場合、元の調理場はゲームから取り除く。<br>*調理コーナーは暖炉ではない。<br>*アクションスペースから動物を入手した場合、それを牧場に入れるスペースがなくても、牧場に入れずにただちに食料に換えることができる。<br>*収穫の繁殖フェイズの間は、動物を食料に換えられない。最後の収穫の繁殖フェイズの後は、ただちにゲーム終了となるため、最後の繁殖フェイズで入手した動物を食料に換えることはできない。</div>\
<div id="ja-text-86" title="86. 乾燥小屋"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png">2x<img align="absmiddle" src="img/pionRoseau16.png"> or 2x<img align="absmiddle" src="img/pionArgile16.png">2x<img align="absmiddle" src="img/pionRoseau16.png"></p>畑フェイズの後で空いている畑があれば、すぐに小麦を植えられる。ただし置く小麦は1つ少なくなる。<br>*乾燥小屋が起動するタイミングは、水車と同じ、かつ、収穫手伝いよりも前である。<br>*乾燥小屋の能力で小麦を植えた場合でも、畑作人の効果は発動する。<br>*あなたは、乾燥小屋の能力で実際に植えられる畑よりも少ない数の畑に小麦を植えることを選んでもよい。</div>\
<div id="ja-text-87" title="87. かめ"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionArgile16.png"></p>誰かが井戸を作るか村の井戸に改良するたびに、他の人は食料1、自分は食料4を得る。（すでに井戸がある場合はカードを出したときに得る）<br>*井戸が村の井戸に改良された後、再び井戸が出された場合にも、かめの効果は発動する。かめがプレイされたときにすでに村の井戸が出ていた場合、もらえる食料は2倍にはならない。かめがプレイされたときに井戸と村の井戸が両方場に出ていた場合、もらえる食料は2倍になる。</div>\
<div id="ja-text-88" title="88. 投げ縄"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionRoseau16.png"></p>あなたは、ちょうど2人の家族を続けて置ける。ただし、そのうち少なくとも1人は「羊」「猪」「牛」のアクションスペースに置くこと。（5人ゲームの「羊1と食料1を取る、または猪1と…」のアクションスペースは選べない。）<br>*あなたの最初の手番に2人の家族を置いたら、3人目の家族はあなたの2回目の手番に置ける。<br>*同じ手番に、投げ縄でさらに2人の家族を置くことはできない。<br>*4人以上の家族がいれば、同一ラウンドで投げ縄をもう一度使用できる。<br>*動物のアクションスペースに置くのは、最初の家族と2番目の家族どちらでもよい。</div>\
<div id="ja-text-89" title="89. レンガ道"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionArgile16.png"></p>最も価値の高い道を持っている人（自分以外の場合も）は得点計算でボーナス2点を得る。（舗装道路はレンガ道よりも価値が高く、林道はレンガ道よりも価値が低い。）<br>*舗装道路がプレイされていなければ、レンガ道のボーナス点を得る。<br>*レンガ道がプレイされていると、林道によるボーナス点は得られない。<br>*ボーナス点は、カードそのものの得点1点とは別に得る。（訳注：ボーナス点を得られた場合は、このカードは3点分の価値をもたらすことになる。）</div>\
<div id="ja-text-90" title="90. プランター"><p style="font-style:italic">コスト: なし<br>条件: 2x職業</p>あなたの家に隣接する畑（斜めは不可）に種をまくたび、それらの畑に追加の小麦2または野菜1を追加で置く。<br>*これはオプションではない。追加の小麦、野菜は必ず置かなければならない。<br>*条件を満たす畑にすでに作物が植えられている場合、それらが収穫され再度種まきが発生しない限り追加の小麦、野菜は置かれない。<br>*Scarecrow の効果によって1つの畑に山が2つある場合、それぞれの山に追加の作物を置く。</div>\
<div id="ja-text-91" title="91. はしご"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>増築、改築および水車、木骨の小屋、鶏小屋、別荘、ヴィラ、乾燥小屋の建設のときに必要な葦が1つ少なくなる。<br>*1回の増築で複数個の部屋を作るとき、それぞれの部屋についてはしごの効果を適用できる。<br>*あなたは、はしごの効果を適用するときに、増築や改築のコストを変更するような他のカードの効果を同時に使用してもよい。<br>*必要な葦がすでに0になっている場合、はしごは何の効果も及ぼさない。たとえば、増築するときにレンガの屋根と梁打ちを使用しているようなケース。（訳注：おそらく、はしごによる葦の減少効果は、他のコスト変更効果の後に適用する必要があるのだと思います。）</div>\
<div id="ja-text-92" title="92. 堆肥"><p style="font-style:italic">コスト: なし<br>条件: 2 animal(s)</p>収穫がない各ラウンドの終了時、あなたは自分のそれぞれの畑から小麦1または野菜1を取り、自分のストックに置くことができる。<br>*収穫する場合は、すべての畑から収穫しなければならない。<br>*（堆肥によって得られた）収穫がないラウンドの畑フェイズでは、酪農場、糸巻き棒、撹乳器、搾乳台、織機による追加食料は得られない。<br>*ヤギとウマは堆肥をプレイするための前提条件として数える。<br>*雑木林、林務官をプレイしている場合、畑と同じように収穫する。</div>\
<div id="ja-text-93" title="93. 酪農場"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionArgile16.png">3x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫の畑フェイズの最初に、全プレイヤーの農場の羊と牛の数を数える。あなたは、羊5頭および牛3頭ごとに食料1を得る。<br>*羊と牛の数は、それぞれのプレイヤーの所有数を合計する。<br>*ペット、および進歩カードの上で飼っている動物もカウントする。革なめし工、Taxidermistの上にある動物はカウントしない。<br>*収穫のとき、酪農場の効果は糸巻き棒、撹乳器、搾乳台、織機より前に解決する。</div>\
<div id="ja-text-94" title="94. 舗装道路"><p style="font-style:italic">コスト: 5x<img align="absmiddle" src="img/pionPierre16.png"></p>最も価値の高い道を持つ者は2点のボーナス点を得る。（舗装道路はレンガ道、林道よりも価値が高い。）<br>*このカードを出せば、常にボーナス点が得られる。このとき、他のカードではボーナス点は得られない。<br>*ボーナス点は、このカード自身が持つ2点とは別に得る。</div>\
<div id="ja-text-95" title="95. 梁"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>「漁」のアクションスペースを使うか、葦を得るアクションスペースから葦を得た場合、追加で食料1を得る。<br>*葦の交換、親切な隣人のプレイや、葦買い付け人、葦集めおよび、それ以外の職業の効果で葦を得た場合には、梁の能力は起動しない。<br>*網漁師の「『漁』のアクションスペースにある食料を全部取る」能力では、梁の能力は起動しない。</div>\
<div id="ja-text-96" title="96. 葦の交換"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"> or 2x<img align="absmiddle" src="img/pionArgile16.png"></p>このカードをプレイするとすぐに、葦2を得る。このカードはプレイ後、左隣のプレイヤーの手札に入る。<br>*木1またはレンガ1で葦1と交換、または木1とレンガ1で葦2と交換、といったことはできない。<br>*葦の交換のプレイでは、網漁師の効果は発動しない。</div>\
<div id="ja-text-97" title="97. 畜殺場"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionArgile16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>他のプレイヤーが1匹以上の動物を食料に換えるたび、あなたは共通のストックから食料1を取る。収穫の食糧供給フェイズで、あなたは最後に行動する（つまり、他のプレイヤーの畜殺により恩恵を得ることができる）。（あなた自身が動物を食料に換えた場合は、特に何も得られない。）<br>*畜殺場と畜殺人が同時に場に出ている場合、食糧供給の順番はこのターンのプレイ順に従う。（訳注：スタートプレイヤーに近い方が先に食糧供給する。）</div>\
<div id="ja-text-98" title="98. 火酒製造所"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionLegume16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫の食糧供給フェイズで、あなたは火酒製造所を使い野菜最大1を食料4にできる。ゲーム終了時、あなたの持つ5個目と6個目の野菜についてそれぞれボーナス1点を得る。<br>*火酒製造所の購入に必要な野菜、食料4に換える際に支払う野菜については、畑の野菜から支払わないこと。必ず自分のストックから支払う。<br>*火酒の製造は「パンを焼く」ではない。また、スパイスの効果は発動しない。</div>\
<div id="ja-text-99" title="99. わら小屋"><p style="font-style:italic">コスト: なし<br>条件: 3 Grain field(s)</p>増築や改築のとき、葦が不要となる。<br>*小麦畑は、小麦マーカーが1つ以上置かれている畑や進歩のことをいう。収穫済みの空の畑は小麦畑ではない。<br>*増築や改築のコストを変更する他のカードと効果を併用しても良い。</div>\
<div id="ja-text-100" title="100. 酒場"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>酒場は追加のアクションスペースである。他のプレイヤーがここを使うと食糧3を得る。あなたがここを使ったときは、食糧3を得るか、ボーナス点2点を得るかをあなたが選ぶ。（他のプレイヤーが酒場を使っても、あなたは特に何も得られない。）<br>*他のすべてのアクションスペースと同じように、酒場は同じラウンド中には最大1人しか使えない。<br>*あなたが酒場に家族を置き、ボーナス点を選んだ場合は、そのことをスコアシートに記録しておく。</div>\
<div id="ja-text-101" title="101. 家畜の餌"><p style="font-style:italic">コスト: なし<br>条件: 4 planted field(s)</p>得点計算の直前に、1匹以上所有している家畜の種類ごとに1匹ずつ増える。（農場内に置き場所が必要）<br>*前提条件を数える際に、畑に植えられているのは小麦、野菜のどちらでもよい。<br>*マメ畑、レタス畑、カブ畑は、カードの上に野菜が植えてあれば、家畜の餌の前提条件として数える。平地は、植えられている畑の数を前提条件として数える。<br>*雑木林、Giant Pumpkin、林務官は前提条件として数えない。<br>*あなたは、家畜の餌の効果によってやってくる動物の置き場所を作るために、手持ちの動物をストックに戻しても良い。<br>*得点計算の時に、家畜の餌の効果で増えた動物を（たとえば、小作人のコスト支払いのために）食料に換えることはできない。<br>*家畜小作人をプレイしている場合、借りた動物を返す前に家畜の餌の効果が発動する。</div>\
<div id="ja-text-102" title="102. 動物園"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2x職業</p>このカードの上に羊1頭、猪1頭、牛1頭をそれぞれ飼える。（このカードは得点計算で牧場に含めない。）<br>*動物園の収容能力は、角笛や水飲み場の効果によって上昇する。</div>\
<div id="ja-text-103" title="103. 水車"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png">2x<img align="absmiddle" src="img/pionArgile16.png">1x<img align="absmiddle" src="img/pionRoseau16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫の畑フェイズの後で、各プレイヤーは水車を使って小麦最大1を食糧3に換えられる。水車を使うプレイヤーは、あなたに食糧1を渡す。<br>*水車の使用は「パンを焼く」ではない。<br>*水車をあなた自身が使う場合は特に制限はない。</div>\
<div id="ja-text-104" title="104. 週末市場"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionCereale16.png"></p>このカードをプレイしたらすぐに、野菜2を得る。このカードはプレイ後、左隣のプレイヤーの手札に入る。<br>*カードをプレイするためのコストとして、畑に植えてある小麦を使うことはできない。<br>*露天商の女の能力は起動する。出来高労働者の能力は起動しない。</div>\
<div id="ja-text-105" title="105. 平地"><p style="font-style:italic">コスト: なし<br>条件: 1x職業</p>種をまくとき、畑2つに植えるようにしてこのカードの上に小麦2を植えることができる。（このカードは得点計算で畑に含めない）<br>*平地は、小さい進歩を出すときの前提条件で、畑2つ分として数える。<br>*あなたは、このカードの上に小麦を1つだけ植えることを選んでもよい。その後の種をまくアクションで、あなたはこのカードの上の空いている畑に小麦を植えてもよい。このカードは最大で2つ分の畑となる。<br>*収穫フェイズで、あなたはこのカードの上に植えた小麦をそれぞれ収穫する。<br>*畑農や小農夫の効果によって、畑の上に小麦を（3つでなく）4つ置けることがある。これは、平地に小麦を植える場合も同様である。</div>\
<div id="ja-text-106" title="106. パン焼き小屋"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionPierre16.png"><br>条件: 暖炉を返す</p>「パンを焼く」のアクションのたびに小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」のアクションができる。<br>*古い暖炉は返却する。レンガ暖炉と石の暖炉は、大きい進歩置き場に戻す。木の暖炉とパン焼き暖炉はゲームから取り除く。パン焼き部屋は、パン焼き小屋にアップグレードできない。<br>*パン焼き小屋は暖炉ではない。<br>*このカードを出したときに行うパンを焼くアクションでは、すでに出されている他の進歩でパンを焼いても良い。</div>\
<div id="ja-text-107" title="107. 建築用木材"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionPierre16.png"></p>このカードをプレイするとすぐに、木材3を得る。このカードはプレイ後、左隣のプレイヤーの手札に入る。</div>\
<div id="ja-text-108" title="108. ミツバチの巣"><p style="font-style:italic">コスト: なし<br>条件: 2x進歩 and 3x職業</p>これ以降の偶数ラウンドのスペースに、それぞれ食料を2つずつ置く。これらのラウンドのはじめにその食料を得る。<br>*前提条件となる進歩や職業は、プレイされあなたの前に置かれているものをカウントする。（アップグレードや聖マリア像によって）捨てられた進歩はカウントしない。（訳注：わざわざ注釈を添えるほどのことでもないと思いますが、前提条件に進歩を要求する小さい進歩はまれなので、意図して記述しているのでしょう。）</div>\
<div id="ja-text-109" title="109. 焼き串"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>収穫の食糧供給フェイズで動物を1匹以上食料に換えるたび、追加で食料1を得る。<br>*複数匹の動物を食料にしても、追加でもらえるのは食料1だけである。</div>\
<div id="ja-text-110" title="110. 醸造所"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionCereale16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫で食糧供給フェイズのたびに、小麦最大1を食料3にできる。ゲーム終了時に小麦が9つ以上あればボーナス1点を得る。<br>*醸造所を出す際に支払う小麦と、食料3に換えるための小麦は、畑の上の小麦ではなく自分のストックから出さなければならない。<br>*醸造所の使用は「パンを焼く」ではない。</div>\
<div id="ja-text-111" title="111. パン焼き棒"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>職業を出すたびに、続けて「パンを焼く」のアクションができる。<br>*人形使いや職業訓練士の効果で職業を出すときも、パン焼き棒の効果は発動する。<br>*職業を2枚以上出すとき、「パンを焼く」のアクションも複数回行うことができる。<br>*他のプレイヤーの手番に職業を出した場合も、パンを焼くことができる。<br>*パンを焼いて得た食料を、職業を出すコストの支払いにあてることはできない。</div>\
<div id="ja-text-112" title="112. 本棚"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 3x職業</p>職業を1つ出すたびに、職業を出すコストを支払う前に食料3を得る。<br>*パトロンをプレイしている場合、職業を1つ出すたびに（本棚とパトロンの効果をあわせて）食料5を得る。<br>*書き机で職業を2つを出すときは、食料3を2回得る。</div>\
<div id="ja-text-113" title="113. 脱穀棒"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1x職業</p>「畑1を耕す」か「畑を耕して種をまく」のアクションのたびに追加で「パンを焼く」のアクションができる。</div>\
<div id="ja-text-114" title="114. 鴨の池"><p style="font-style:italic">コスト: なし<br>条件: 2x職業</p>これ以降の3ラウンドのスペースに食料をそれぞれ1つずつ置く。これらのラウンドの最初にその食料を得る。</div>\
<div id="ja-text-115" title="115. 耕運鋤"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 3x職業</p>ゲーム中2回、あなたは「畑1を耕す」のアクションスペースを使うとき、畑1の代わりに畑3を耕してもよい。「畑1を耕す そして/または 種をまく」のアクションでは、耕運鋤は使えない。<br>*あなたは、畑3を耕す代わりに畑2を耕すことを選んでも良い。<br>*あなたは、プレイした耕運鋤の上に畑タイル2枚を置くことができる。これは、耕運鋤の効果があと2回使えることを示す。<br>*「畑1を耕す」のアクションスペースを使うとき、あなたは5種類の鋤類および馬鍬のうちどれか1つしか使えない。</div>\
<div id="ja-text-116" title="116. 穀物倉庫"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"> or 3x<img align="absmiddle" src="img/pionArgile16.png"></p>ラウンド8・10・12のうちまだ始まっていないラウンドのスペースに小麦を1つずつ置く。これらのラウンドのはじめにその小麦を得る。<br>*このカードは木材2とレンガ1、あるいは木材1とレンガ2ではプレイできない。（訳注：木材3またはレンガ3が必要。木材とレンガの組み合わせは不可。）<br>*小麦を取る行為は、小麦車、穀物スコップ、出来高労働者、ごますり、種屋、八百屋、てき屋、畑番の能力を起動しない。<br>*現在およびすでに終わったラウンドの小麦は取れない。</div>\
<div id="ja-text-117" title="117. 温室"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1x職業</p>現在のラウンドに4と7を足す。そのラウンドのスペースにそれぞれ野菜を1つずつ置き、ラウンドのはじめに食料1を払えばその野菜を得る。<br>*買われなかった野菜は、共通のストックに戻る。<br>*ラウンドの開始時に受け取る食料を、ただちに野菜の購入コストにあててもよい。</div>\
<div id="ja-text-118" title="118. 肥溜め"><p style="font-style:italic">コスト: なし<br>条件: 4 animal(s)</p>種をまくたびに、共通のストックから追加の小麦1または野菜1を取り、新しく植えた畑に置く。<br>* <p>カードをプレイした時点で何か植えられている畑は、いったん空の畑になってから再度植えられたときに肥溜めの効果を得ることができる。<br>*乾燥小屋を使用した場合でも、追加の小麦か野菜は置ける。<br>*ジャガイモ掘り、プランター、畑農、小農夫の効果を適用後、重ねてさらに肥溜めの効果を適用する。<br>*マメ畑、カブ畑、レタス畑に対しても肥溜めの効果は発動する。<br>*雑木林の上に木材を植えた場合、それぞれの木材の山に追加の木材1を置く。<br>*ヤギとウマはこのカードをプレイするときの前提条件の動物として数える。</div>\
<div id="ja-text-119" title="119. 鉤型鋤"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1x職業</p>ゲーム中1回だけ、「畑1を耕す」のアクションで畑を3つ耕せる。「畑を耕して種をまく」のアクションでは使えない。<br>*耕す畑の数は3つではなく2つにしてもよい。<br>*「畑1を耕す」のアクションスペースを取ったときに鋤類および馬鍬の能力を使う場合は、いずれか1つの能力だけを使用できる。</div>\
<div id="ja-text-120" title="120. ヤギ"><p style="font-style:italic">コスト: なし</p>食糧供給フェイズのたびに、食料1を得る。あなたの家には、ヤギ以外の動物は飼えなくなる。（たとえ調教師をプレイしていても。）（他の動物を家で飼うためにヤギを農場の外に放つことはできない。）<br>*食料を受け取るのを忘れないよう、これ以降の収穫の回数分だけ、このカードの上に食料1を置いてもよい。<br>*ヤギは小さい進歩の前提条件の動物には数えない。</div>\
<div id="ja-text-121" title="121. 木挽き台"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>自分の農場に置く次の厩および3、6、9、12、15番目の柵はコストなしで作れるようになる。<br>*別の方法（たとえば柵管理人）を使って柵を無料で作った場合、木挽き台で本来浮くはずだったコストを次回以降の手番に持ち越すことはできない。柵管理人の効果を適用する前に、木挽き台の効果を適用して柵を置くこと。<br>*柵は、牧場を完全に囲む形でしか置けない。</div>\
<div id="ja-text-122" title="122. 製材所"><p style="font-style:italic">コスト: なし<br>条件: 家具製作所を返す</p>収穫のたび、あなたは木材最大1を食料3にできる。ゲーム終了時、木材2/4/5でボーナス1/2/3点を得る。<br>*家具製作所をアップグレードしたら、家具製作所は（大きい進歩置き場に戻り）再び購入可能となる。<br>*製材所をプレイしている状態で家具製作所を再購入した場合、ゲーム終了時のボーナス点は製材所のみをカウントする。<br>*ゲーム終了時、雑木林および林務官の上にある木材はカウントする。骨細工、資材商人の上にある木材は無視する。</div>\
<div id="ja-text-123" title="123. 木の宝石箱"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>ゲーム終了時、あなたの家の部屋の広さが5の場合は2点のボーナス点、広さが6以上の場合は4点のボーナス点を得る。</div>\
<div id="ja-text-124" title="124. くびき"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1x<img align="absmiddle" src="img/pionBoeuf16.png"></p>このカードをプレイしたらすぐに、（他のプレイヤーが）プレイしている鋤類および馬鍬の数だけ畑を耕す。<br>*あなたは、実際に耕せる畑の数より少ない数を選んでも良い。</div>\
<div id="ja-text-125" title="125. ほうき"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>手札の小さい進歩を全て捨て、新たに7枚引く。そしてすぐにコストを支払い、1枚実行できる。<br>*今回のゲームでKデッキのみを使用している場合は、新たに引くカードはKデッキから引く。複数のデッキを混ぜている場合は、混ぜた状態のデッキから引く。<br>*ゲーム開始時に脇によけておいた未使用の進歩カードの山から、新たなカードを引く。このとき、アップグレードや聖マリア像によってゲーム中に破棄されたカードは山札には加えないこと。</div>\
<div id="ja-text-126" title="126. 柄付き網"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionRoseau16.png"></p>アクションスペースから葦を取るたびに、追加で食料2を得る。ただし、葦以外の建築資材も同時に取る場合は、追加の食料は1となる。<br>*木材配りが木材を「葦1」のアクションスペースに置いた場合、柄付き網の効果で得られる追加食料は1となる。<br>*葦の交換か親切な隣人をプレイしたときには、柄付き網の能力は起動しない。葦買い付け人、葦集め、その他の職業の能力で葦を得た場合も同様である。<br>*進歩や職業の効果で他の資材を得た場合には、追加の食料は2でよい。<br>*資材とは、木材、レンガ、葦、石材のことである。</div>\
<div id="ja-text-127" title="127. がらがら"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>「家族を増やす」のアクションのたびに（またはこのカードを出したラウンドに新しい家族が生まれていたら）、小麦が1つ以上ある畑にさらに小麦1を置く。<br>*追加の小麦は、共通のストックから取る。<br>*平地、あるいはScarecrowの効果で1つの畑の上に小麦の山が複数あるとき、それぞれの小麦の山に小麦1を置く。<br>*乳母、Village Beauty、愛人の効果で家族を増やしたときは、がらがらの効果は発動しない。<br>*Mother of Twins の効果で1度に2人の家族を増やした場合でも、畑に追加で置ける小麦は1つだけである。<br>*5人ゲームの場合、「家族を増やす」を含む選択式のアクションスペースがある。ラウンド5以降、このアクションスペースで他のアクションを実行した場合でも、がらがらの効果は発動する。<br>*雑木林か林務官を出しており、その上に木が植えてあれば、さらに追加の木材1を置く。</div>\
<div id="ja-text-128" title="128. 調理場"><p style="font-style:italic">コスト: なし<br>条件: かまどを返す</p>あなたはいつでも、作物や動物を以下の通り食料に換えられる。野菜:食料3、羊:食料2、猪:食料3、牛:食料4。「パンを焼く」のアクションでは、小麦1を食料3に換えられる。<br>*大きい進歩のかまどをアップグレードする場合、元のかまどは大きい進歩置き場に返す。小さい進歩の簡易かまどをアップグレードする場合、元の簡易かまどはゲームから取り除く。<br>*あなたは、複数個の調理場を所有できる。<br>*このカードで、動物や野菜を同時にいくらでも食料にできる。「パンを焼く」場合は、一度に小麦をいくつでも食料にできる。三つ足やかんの能力を起動するために、パンを焼くのと同時に他の品物を食料にしてもよい。<br>*調理場は暖炉ではない。<br>*アクションスペースから動物を入手した場合、それを牧場に入れるスペースがなくても、牧場に入れずにただちに食料に換えることができる。<br>*収穫の繁殖フェイズの間は、動物を食料に換えられない。最後の収穫の繁殖フェイズの後は、ただちにゲーム終了となるため、最後の繁殖フェイズで入手した動物を食料に換えることはできない。<br>*このカードは、小さい進歩としてプレイできる点を除いて、大きい進歩の調理場とまったく同じである。</div>\
<div id="ja-text-129" title="129. 穀物の束"><p style="font-style:italic">コスト: なし</p>このカードを出したらすぐに小麦1を得る。このカードはプレイ後、左隣のプレイヤーの手札に入る。</div>\
<div id="ja-text-130" title="130. 薬草畑"><p style="font-style:italic">コスト: なし<br>条件: 1 Vegetable field(s)</p>これ以降の5ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。<br>*野菜畑は、野菜マーカーが1つ以上置かれている畑のことである。野菜がすべて収穫され何も植えられていない畑は、野菜畑には数えない。<br>*マメ畑、レタス畑、カブ畑は、それらの上に野菜マーカーが置かれていれば、イチゴ花壇（訳注：薬草畑の誤りだと思います）の前提条件に数える。<br>*Seed Trader、小売人、Giant Pumpkin、Pumpkin Seed Oil は薬草畑の前提条件に数えない。</div>\
<div id="ja-text-131" title="131. レンガ坑"><p style="font-style:italic">コスト:なし<br>条件: 3x職業</p>「日雇い労働者」のアクションのたびに、追加でレンガ3を得る。</div>\
<div id="ja-text-132" title="132. レンガの家増築"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionRoseau16.png">4x<img align="absmiddle" src="img/pionArgile16.png"></p>このカードを出すとすぐに、レンガの家が1部屋増築される。</div>\
<div id="ja-text-133" title="133. 搾乳台"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2x職業</p>収穫の畑フェイズのたびに、あなたが飼っている牛1/3/5頭につき食料1/2/3を得る。ゲーム終了時、牛2頭につき1点のボーナス点を得る。</div>\
<div id="ja-text-134" title="134. 牛車"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2x<img align="absmiddle" src="img/pionBoeuf16.png"></p>このカードを出したらすぐに、まだ始まっていないラウンドの数を数える。その数だけ（ただし最大3）畑を耕せる。<br>*耕す畑の数を、実際に耕せる数より少なくしても良い。</div>\
<div id="ja-text-135" title="135. ウマ"><p style="font-style:italic">コスト: なし</p>ゲーム終了時、1頭も持っていない種類の動物があれば、ボーナス2点を得る。（ウマがその代わりとなる。）（持っていない種類の動物によるマイナス点はそのまま受け取る。）<br>*ウマは農場内に置き場所を必要としない。<br>*ウマの2点は、得点計算上はボーナス点の扱いとなる。<br>*村長と自由農夫の得点計算において、ウマはマイナス点となる種類の動物に置き換わる。<br>*ウマは小さい進歩の前提条件の動物には数えない。</div>\
<div id="ja-text-136" title="136. 柴屋根"><p style="font-style:italic">コスト: なし<br>条件: 2x職業</p>増築や改築で、葦1か2を同数の木材に変えられる。<br>*増築の際、葦が2つ必要なところを、葦1と木材1で代用してもよい。<br>*あなたは他の増築や改築のコストを変更するカードを柴屋根と一緒に使用してもよい。例えば、レンガの屋根を一緒に使った場合、増築時の葦2を木材1とレンガ1で代用できる。<br>*1回で2部屋以上増築する場合、それぞれの部屋について柴屋根の効果を適用できる。</div>\
<div id="ja-text-137" title="137. カブ畑"><p style="font-style:italic">コスト: なし<br>条件: 3x職業</p>あなたが種をまくとき、畑に植えるのと同じように野菜をこのカードの上に植えることができる。このカードをプレイするとき、同時に「種をまく」のアクションができる。（このカードは得点計算で畑には数えない。）<br>*（訳注：畑に植えるようにして）野菜マーカーをカブ畑の上に置いた場合、それは薬草畑やイチゴ花壇の前提条件に数える。</div>\
<div id="ja-text-138" title="138. 葦の家"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png">4x<img align="absmiddle" src="img/pionRoseau16.png"></p>まだ使用していない家族トークン1つをこのカードの上に置き、以降このゲームの間はここに住む。（このカードを出したラウンドから）通常の家族と同じようにアクションが実行できるが、食糧供給も同じように必要。葦の家の住人は家族としての得点にはならない。（あとで「家族を増やす」のアクションを使い、この住人を家の部屋に移動できる。）<br>*葦の家の住人は、葦の家ができたラウンドからアクションが可能。葦の家をプレイしたらすぐに、家族トークンをこのカードの上に置く。<br>*「家族を増やす」のアクションで葦の家の住人を家に移す場合、移動させたラウンドは新生児として扱う。このため、移動したラウンドはアクションは実行できない。<br>*葦の家の住人は家族を増やす際の条件をチェックするときは無視する。葦の家の住人は家族には数えない。<br>*葦の家の住人は、家族のアクションとゲストのアクション。ただしKegで受け取るゲストよりは前がすべて終わった後に動かす。（訳注：以下の順となります。家族のアクション→ゲストのアクション（この時点でKegは未発動）→葦の家の住人のアクション→Kegの効果で得たゲストのアクション）<br>*葦の家のプレイは、「家族を増やす」のアクションではない。</div>\
<div id="ja-text-139" title="139. 寝室"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2 Grain field(s)</p>他のプレイヤーがすでに「家族を増やす」のアクションスペースに家族を置いていても、あなたはそこに家族を置ける。<br>*「家族を増やす」のアクションが含まれていれば、どのアクションスペースでも置ける。<br>*5人ゲームで、「家族を増やす」を含む選択式のアクションスペースがある。ラウンド5以降、あなたはこのアクションスペースに常に家族を置くことができ、「家族を増やす」ではないほうのアクションを選択しても良い。<br>*小麦畑は、最低1つの小麦が植えられている畑のことをいう。収穫済みの空の畑は小麦畑ではない。<br>*平地および、Scarecrowの効果によって2つの小麦が植えられている畑については、畑の上に小麦が何列植えられているかを数える。<br>*すでに自分の家族が「家族を増やす」アクションスペースを使っている場合は、そこに家族を置くことはできない。</div>\
<div id="ja-text-140" title="140. 白鳥の湖"><p style="font-style:italic">コスト: なし<br>条件: 4x職業</p>これ以降の5ラウンドの各スペースに食料1を置く。これらのラウンドの開始時に、その食料を得る。</div>\
<div id="ja-text-141" title="141. 猪の飼育"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionPN16.png"></p>このカードを出したらすぐに、猪1を得る。このカードはプレイ後、左隣のプレイヤーの手札に入る。<br>*手に入れた猪は、ただちにかまど、調理場、調理コーナー、精肉屋、肉屋で食料に換えても良い。</div>\
<div id="ja-text-142" title="142. 石車"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2x職業</p>これ以降の偶数ラウンドのアクションスペースに石材1を置く。これらのラウンドの開始時に、その石材を取る。</div>\
<div id="ja-text-143" title="143. 石の交換"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"> or 2x<img align="absmiddle" src="img/pionArgile16.png"></p>このカードをプレイしたらすぐに、石材2を得る。このカードはプレイ後、左隣のプレイヤーの手札に入る。<br>*木材1またはレンガ1で石材1と交換する、あるいは木材1とレンガ1で石材2と交換する、といったことはできない。</div>\
<div id="ja-text-144" title="144. ヴィラ"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png">3x<img align="absmiddle" src="img/pionArgile16.png">2x<img align="absmiddle" src="img/pionRoseau16.png">3x<img align="absmiddle" src="img/pionPierre16.png"></p>ゲーム終了時、あなたの石の家1部屋につき2点のボーナス点を得る。<br>*木骨の小屋とヴィラを両方プレイしている場合、ヴィラのボーナス点のみを得る。<br>*族長とヴィラを両方プレイしている場合、両方のカードのボーナス点を得る。</div>\
<div id="ja-text-145" title="145. 森の牧場"><p style="font-style:italic">コスト: なし<br>条件: 3x職業</p>このカードの上に猪をいくつでも置ける。（このカードは得点計算で牧場に含めない。）<br>*このカードの上の猪は、得点計算に含める。</div>\
<div id="ja-text-146" title="146. 織機"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2x職業</p>収穫の畑フェイズのたびに、羊1/4/7で食料1/2/3を得る。得点計算のとき、羊3匹ごとにボーナス1点を得る。</div>\
<div id="ja-text-147" title="147. 畑商人"><p style="font-style:italic">コスト: なし</p>あなたは「野菜1を取る」のアクションスペースを使うたび、小麦1も取る。このカードをプレイしたら、共通のストックから野菜1を取る。</div>\
<div id="ja-text-148" title="148. 大学者"><p style="font-style:italic">コスト: なし</p>小さい進歩や「代官」「家庭教師」の得点計算で、このカードは職業2つ分として扱う。<br>*大学者を出すときにパン焼き棒(K111)や本棚(K112)の効果が起動する場合、それは職業1回分として数える。</div>\
<div id="ja-text-149" title="149. パン焼き長老"><p style="font-style:italic">コスト: なし</p>他のプレイヤーがパンを焼くとき、あなたもパンを焼く設備があればパンを焼ける。あなた自身が「パンを焼く」アクションを行ったときは、追加で食糧1を得る。<br>*他のプレイヤーが暖炉、かまど(A1/A2)、調理場(A3/A4)、調理コーナー(I85)、パン焼き部屋(I65)、パン焼き部屋(K106)を使って小麦を食料に換えたとき、パン焼き長老の能力が起動する。<br>*他のプレイヤーが「種をまく そして パンを焼く」のアクションスペースを使い、しかしパンを焼かなかった場合は、パン焼き長老の能力は起動しない。<br>*蒸留、ビールの醸造、水車(I103)、風車小屋(E17)、手挽き臼(I75)の使用は「パンを焼く」ではない。<br>*パン焼き長老の能力でパンを焼いた場合は、追加の食糧は得られない。</div>\
<div id="ja-text-150" title="150. パン職人"><p style="font-style:italic">コスト: なし</p>パンを焼く進歩を持っていれば、収穫フェイズの職業供給フェイズの最初にパンを焼ける。このカードを出したときに追加で「パンを焼く」のアクションができる。<br>*このカードを出したときの「パンを焼く」アクションについて、あなたは所有する暖炉、進歩のどれを使ってパンを焼くかを自由に決めてよい。</div>\
<div id="ja-text-151" title="151. 建築士"><p style="font-style:italic">コスト: なし</p>ゲーム中1回、あなたの家の部屋の数が5以上ならいつでも1部屋を無料で増築できる。<br>*部屋タイルを1枚このカードの上に置いておき、まだ能力が使えることを示してもよい。<br>*建築士の能力で増築するときは、アクションスペースを使う必要はない。</div>\
<div id="ja-text-152" title="152. イチゴ集め"><p style="font-style:italic">コスト: なし</p>あなたは人を使ったアクションで木材を取るたび、追加で食糧1を得る。<br>*木材が置かれているアクションスペースを使った場合に、イチゴ集めの能力が起動する。木材が置かれていないアクションスペースを使った場合は、イチゴ集めの能力は起動しない。(例：木材配り(K284))<br>*かご(E34)、キノコ探し(E196)、猪猟師(I253)の能力ですべての木材をアクションスペースに残した場合でも、イチゴ集めの能力は起動する。<br>*木材が含まれるアクションスペースであれば、イチゴ集めの能力が起動する。(例：木材配り)<br>*5人ゲームの「葦1と石材1木材1」のアクションスペースを使った場合、または3人ゲームの「建築資材1つを取る」で木材を取った場合にも、イチゴ集めの能力が起動する。<br>*建築資材(E16)をプレイしたときにもイチゴ集めの能力は起動する。それ以外の小さい進歩や職業で木材を得た場合は、イチゴ集めの能力は起動しない。</div>\
<div id="ja-text-153" title="153. 托鉢僧"><p style="font-style:italic">コスト: なし</p>ゲーム終了時、あなたは物乞いカードを2枚まで捨ててもよい。</div>\
<div id="ja-text-154" title="154. 醸造師"><p style="font-style:italic">コスト: なし</p>収穫の食糧供給フェイズの間に、醸造師は小麦最大1を食糧3にできる。<br>*ビールの醸造は「パンを焼く」ではない。<br>*食料に換える小麦は、畑に植えてあるものを使ってはいけない。あなたのストックにある小麦を使うこと。</div>\
<div id="ja-text-155" title="155. パン屋"><p style="font-style:italic">コスト: なし</p>誰か(あなたも含む)がパンを焼くたびに、あなたはパンに換えた小麦1つにつき食糧1を共通のストックから受け取る。<br>*蒸留、ビールの醸造、水車(I103)、風車小屋(E17)、手挽き臼(I75)の使用は「パンを焼く」ではない。<br>*他のプレイヤーが暖炉、かまど(A1/A2)、調理場(A3/A4)、調理コーナー(I85)、パン焼き部屋(I65)、パン焼き部屋(K106)を使って小麦を食料に換えたとき、パン屋の能力が起動する。<br>*プレイヤーの誰かが「種をまく そして パンを焼く」のアクションスペースを使い、しかしパンを焼かなかった場合は、パン屋の能力は起動しない。</div>\
<div id="ja-text-156" title="156. ブラシ作り"><p style="font-style:italic">コスト: なし</p>食糧に換えた猪をこのカードの上に置く。ゲーム終了時、このカードの上にある猪の数によってあなたはボーナス点を得る。4匹以上で3点、3匹で2点、2匹で1点。<br>*食糧に換えた猪は、革なめし工(K280)、Taxidermist(Z330)、ブラシ作りのいずれかの上に置く。同じ猪を2枚のカードの上に置くことはできない。<br>*骨細工(K273)や毛皮(K339)とブラシ作りを同時にプレイしていた場合、食糧に換えた猪をブラシ作りの上に置きつつ、骨細工や毛皮の能力を使用してよい。<br>*このカードの上にある猪マーカーは、ゲーム終了時の得点計算ではカウントしない。</div>\
<div id="ja-text-157" title="157. 屋根がけ"><p style="font-style:italic">コスト: なし</p>水車(I103)、木骨の小屋(E21)、鶏小屋(I84)、別荘(I71)、ヴィラ(K144)、乾燥小屋(I86)の建設および増築、改築で必要な葦を1つ減らせる。<br>*2部屋以上増築する場合、それぞれの部屋ごとに屋根がけの能力を使用できる。<br>*同じアクション内で、はしご(I91)などの増築コストを軽減する他のカードと屋根がけを同時に使用してもよい。<br>*増築の際、レンガの屋根(E36)、梁打ち(K272)を同時に使った場合などですでに必要な葦が0になっている場合、屋根がけは何の効果も及ぼさない。(訳注：レンガの屋根だけで必要な葦は0にできます。梁打ちは関係ありません。おそらく原文の誤り)</div>\
<div id="ja-text-158" title="158. 旋盤職人"><p style="font-style:italic">コスト: なし</p>あなたはいつでも、旋盤職人で木材1を食糧1に換えられる。</div>\
<div id="ja-text-159" title="159. 家長"><p style="font-style:italic">コスト: なし</p>あなたは、「増築」「家族を増やす」のアクションスペースにすでに他のプレイヤーの人が置かれていても、そのアクションスペースを使用できる。<br>*同じラウンド中に、あなたの人々を同じアクションスペースに2人置くことはできない。<br>*選択式のアクションスペースの場合、あなたは増築のアクションを選択しなくてもよい。<br>*5人ゲームの「増築/小劇場」のアクションスペースで他のプレイヤーが増築を行った後に、あなたはそのスペースを使い「小劇場」のアクションを行ってもよい。<br>*5人ゲームで、「家族を増やす」を含む選択式のアクションスペースがある。ラウンド5以降、あなたはそのスペースを自由に使える。「家族を増やす」を行わなくてもよい。</div>\
<div id="ja-text-160" title="160. 農場主"><p style="font-style:italic">コスト: なし</p>あなたは次に柵を立てたとき、猪1を得る。それ以降、柵を1本以上立てるたびに牛1を得る。<br>*あなたは手番ごとに新しい家畜を1匹だけ得る。同じアクション内で複数の牧場を作っても、もらえる家畜は1匹だけ。<br>*柵見張り(K312)の能力を使ったとき、または小牧場(E40)をプレイしたときに、農場主の能力が起動する。<br>*手に入れた家畜は、即座に進歩で食糧に換えてもよい。このとき、農場内に空きスペースが無くてもよい。</div>\
<div id="ja-text-161" title="161. 漁師"><p style="font-style:italic">コスト: なし</p>あなたは「漁」のアクションスペースを使うたび、そのスペースにおいてある食糧の2倍を得る。そうした場合、あなたは釣竿(E12)、いかだ(E22)、カヌー(E30)、梁(I95)、柄付き網(K126)の所有者にそれぞれ食糧1を支払う。<br>*アクションスペースにある食糧だけが2倍になる。アクションスペースにある食糧を取り、それと同じだけの食糧を共通のストックから取る。<br>*あなたが食糧を支払うのは、他のプレイヤーがプレイしている(漁師の食糧支払いの対象となる)進歩だけを対象とする。<br>*あるプレイヤーが(漁師の食糧支払いの対象となる)複数の進歩をプレイしている場合、そのプレイヤーには、プレイしている進歩の数だけ食糧を支払う。<br>*あなた自身が(漁師の食糧支払いの対象となる)進歩をプレイしている場合は、食糧を支払う必要はない。<br>*あなたが受け取る食糧よりも、支払う食糧の方が多くなる可能性もある。漁師の能力を使った後で他のプレイヤーに支払う食糧が足りなくなる場合、あなたは漁師の能力を使用できない。<br>*漁師の能力の使用はオプションである。2倍の食糧を得ることをしなかった場合、他のプレイヤーへの食糧の支払いもない。<br>*網漁師(I248)の能力の使用では、漁師の能力は起動しない。</div>\
<div id="ja-text-162" title="162. 肉屋"><p style="font-style:italic">コスト: なし</p>暖炉があれば、いつでも家畜を食糧に換えられる。羊1は食糧2、猪1は食糧3、牛1は食糧4。<br>*暖炉をパン焼き部屋(I65)、パン焼き小屋(K106)に改良した場合、他に暖炉を持っていない限り肉屋の能力は使えなくなる。(訳注：パン焼き部屋とパン焼き小屋は暖炉ではないのです。)<br>*アクションスペースから取った家畜を即座に食糧に換えてもよい。このとき、農場内に家畜を置くスペースがなくてもよい。<br>*収穫の繁殖フェイズの間は、あなたは家畜を食糧にできない。最後の収穫の繁殖フェイズの後はすぐにゲーム終了となるため、あなたは最後の繁殖で増えた家畜を食糧にすることはできない。</div>\
<div id="ja-text-163" title="163. 畑守"><p style="font-style:italic">コスト: なし</p>あなたは、「野菜1を取る」「畑1を耕す」「畑1を耕す そして 種をまく」のアクションスペースにすでに他のプレイヤーの人が置かれている場合でも、そのアクションスペースを使用できる。<br>*あなたは、自分の人々を同じアクションスペースに2人置くことはできない。<br>*畑守と営農家(K289)を同時にプレイしている場合、あなたの家族を営農家の能力で「畑1を耕す そして 種をまく」に移動できる。</div>\
<div id="ja-text-164" title="164. 営林士"><p style="font-style:italic">コスト: なし</p>3人ゲームの「木材2」のカードを場に置く。各ラウンドの開始時に、木材2をこのカードの上に置く。このアクションスペースを使うプレイヤーはあなたに食糧2を支払う。<br>*営林士(によって登場したアクションスペース)をあなた自身が使う場合、食糧を支払う必要はない。<br>*食糧は木材を取る前に支払うこと。イチゴ集め(E152)などで木材を得たときに食糧を得られる場合に、その食糧を営林士(のアクションスペース)の利用料に充てることはできない。</div>\
<div id="ja-text-165" title="165. 自由農夫"><p style="font-style:italic">コスト: なし</p>ゲーム終了時、あなたは未使用の農場スペースと物乞いカードだけがマイナス点となる。<br>*自由農夫で得る得点はボーナス点として記録する。マイナス点となったカテゴリーの数を数え、その点を自由農夫のボーナス点とする。<br>*自由農夫で相殺されたマイナス点は、村長(K276)のマイナス点チェックの際にはマイナス点とはみなさない。 (訳注：自由農夫を出していて、かつ物乞いなし、未使用スペースなしであれば村長ボーナスの対象です。)<br>*ウマ(K135)によってあなたが持っていない種類の家畜を補正したとしても、そのカテゴリーについて自由農夫のボーナス点はもらえる。(さらに、ウマによるボーナス2点ももらえる。)</div>\
<div id="ja-text-166" title="166. 庭職人"><p style="font-style:italic">コスト: なし</p>「日雇い労働者」のアクションスペースを使うたび、野菜1を得る。</div>\
<div id="ja-text-167" title="167. 奇術師"><p style="font-style:italic">コスト: なし</p>あなたは「小劇場」のアクションスペースで「小劇場」のアクションを行うたび、小麦1を追加で得る。<br>*他のプレイヤーが旅芸人(I237)を使って「小劇場」のアクションを行った場合、そのプレイヤーはあなたに食糧1を支払う。</div>\
<div id="ja-text-168" title="168. 八百屋"><p style="font-style:italic">コスト: なし</p>「小麦1を取る」のアクションスペースを使うたび、野菜1を得る。</div>\
<div id="ja-text-169" title="169. 昔語り"><p style="font-style:italic">コスト: なし</p>あなたは「小劇場」のアクションスペースで「小劇場」のアクションを行うたび、そのスペースに食糧1を残してかわりに野菜1を受け取ることができる。<br>*他のプレイヤーが旅芸人(I237)を使って「小劇場」のアクションを行った場合、そのプレイヤーはあなたに食糧1を支払う。<br>*踊り手(E212)を同時にプレイしている場合、あなたはアクションスペースに食糧1を残したとき、最低4つの食糧と野菜1を得る。</div>\
<div id="ja-text-170" title="170. 大農場管理人"><p style="font-style:italic">コスト: なし</p>ゲーム終了時、3種類の家畜それぞれについてあなたよりも多く飼っている人がいなければ、ボーナス点を得る。3人ゲームなら2点、4人ゲームなら3点、5人ゲームなら4点。<br>*ウマ(K135)を出しているプレイヤーがいた場合、ウマはそのプレイヤーが飼っていない家畜(種類はそのプレイヤーが決める)としてふるまうが、大農場管理人の計算には含めない。ヤギ(K120)は家畜として数えない。</div>\
<div id="ja-text-171" title="171. 港湾労働者"><p style="font-style:italic">コスト: なし</p>いつでも、あなたは港湾労働者の能力で木材3をレンガ1、葦1、石材1のいずれかに換えられる。また、レンガ2、葦2、石材2のいずれかを他の建築資材1つと交換できる。<br>*建築資材とは、木材、レンガ、葦、石材のことである。</div>\
<div id="ja-text-172" title="172. 族長"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionPN16.png"></p>ゲーム終了時、あなたは石の家の部屋1つごとに1点のボーナス点を得る。このカードをプレイするのに追加で食糧2が必要。<br>*木骨の小屋(E21)を一緒にプレイしていた場合、あなたは部屋1つごとに4点を得る。ヴィラ(K144)を一緒にプレイしていた場合、または族長、ヴィラ、木骨の小屋3枚を一緒にプレイしていた場合は、あなたは部屋1つごとに5点を得る。</div>\
<div id="ja-text-173" title="173. 族長の娘"><p style="font-style:italic">コスト: なし</p>他のプレイヤーが族長(E172)をプレイしたとき、あなたはすぐにこのカードを無料でプレイできる。ゲーム終了時、あなたが石の家に住んでいれば3点のボーナス点を、レンガの家に住んでいれば1点のボーナス点を得る。<br>*あなたは、このカードを通常通りの方法で(職業の)アクションスペースを使ってプレイしてもよい。<br>*あなた自身が族長(E172)をプレイした場合、族長の娘を同じタイミングで無料でプレイすることはできない。<br>*ソリティアゲームでは、あなたはこのカードを(職業の)アクションスペースを使ってプレイするしかない。<br>*木のスリッパ(E28)を一緒にプレイしていた場合、あなたは両方のカードからボーナス点を得る。<br>*族長のプレイに伴ってあなたが族長の娘をプレイしたとき、パン焼き棒(K111)、本棚(K112)、パトロン(E192)、職業訓練士(K271)の能力が起動する。しかし、書き机(E49)、ぶらつき学生(K275)、Therapist(O03)の能力は起動しない。(訳注：職業訓練士の起動タイミングは、族長のプレイと族長の娘のプレイを併せて2回あることになります。)</div>\
<div id="ja-text-174" title="174. 家庭教師"><p style="font-style:italic">コスト: なし</p>ゲーム終了時、あなたはこのカードをプレイした以降にプレイした職業1枚につき1点のボーナス点を得る。<br>*あなたは獲得するボーナス点を直ちにスコアシートに記録するか、または単純にプレイした職業をその順に並べておく。<br>*大学者(E148)は職業2枚分として数える。<br>*ソリティアゲームのゲーム終了時の職業選択ででこのカードをキープした場合、続くゲームにおいて、初めから置かれている(家庭教師以外の)職業カードについても家庭教師のボーナス点になる。</div>\
<div id="ja-text-175" title="175. 柵管理人"><p style="font-style:italic">コスト: なし</p>あなたは柵を1本以上立てたとき、追加で無料の柵を3本置ける。<br>*柵見張り(K312)、柵立て(I263)、柵運び(I265)の能力で柵を立てたとき、および小牧場(E40)をプレイしたときも、柵管理人の能力が起動する。<br>*農場主(E160)、厩番(E207)、彫刻家(K301)、木挽き台(K121) をプレイしている場合、柵建設時にこれらのカードの能力を組み合わせてよい。<br>*柵管理人の能力で置く無料の柵は、柵建設のアクションと同じように建設するが、柵を置く順番はあなたが決める。ただし、手番内で最初の柵を立てるのに柵管理人の能力は使えない。(訳注：柵のアクションで柵を完成させてから柵管理人の能力を適用するのではなく、柵管理人の能力で得た無料の柵と合わせて柵が完成すればOK、という意味だと思います。)<br>*柵管理人の能力は、1回の手番中に1度しか使えない。<br>*追加の柵を置いた後、柵の状態は通常の柵建設と同様、正しい状態でなければならない。(たとえば、牧場は四方を柵で囲われていること、など)<br>*追加で置く柵を3本より少なくしてもよい。たとえば、未使用の柵が3本より少ない場合など。<br>*柵管理人で置いた柵が3本より少なかった場合、差分を以降のラウンドのためにストックしておくことはできない。</div>\
<div id="ja-text-176" title="176. 木こり"><p style="font-style:italic">コスト: なし</p>あなたは、あなたの人を使ってアクションで木材を得るたびに追加で木材1を得る。<br>*木材が置かれているアクションスペースを使った場合に、木こりの能力が起動する。木材が置かれていないアクションスペースを使った場合は、木こりの能力は起動しない。(例：木材配り(K284))<br>*かご(E34)、キノコ探し(E196)、猪猟師(I253)の能力でアクションスペースに木材を全部残した場合でも、木こりの能力は起動する。<br>*木材が含まれるアクションスペースであれば、木こりの能力が起動する。(例：木材配り)<br>*5人ゲームの「葦1と石材1木材1」のアクションスペースを使った場合および3人ゲームの「建築資材1つを取る」のアクションスペースを使い木材を取った場合、木こりの能力が起動する。<br>*小さい進歩や職業の効果で木材を得た場合は、木こりの能力は起動しない。</div>\
<div id="ja-text-177" title="177. 木大工"><p style="font-style:italic">コスト: なし</p>ゲーム終了時、あなたの木の家の部屋1つごとにボーナス点を1点得る。</div>\
<div id="ja-text-178" title="178. 小屋大工"><p style="font-style:italic">コスト: なし</p>このカードはラウンド1-4の間に出す。ラウンド11の最初に、あなたは無料で1部屋増築できる。ただし石の家に改築していた場合は増築できない。<br>*このカードをプレイしたら、部屋タイルをラウンド11のアクションスペースにリマインダーとして置いておく。<br>*ラウンド4を過ぎてからこのカードをプレイしてもよいが、その場合は何の効果もない。<br>*ラウンド11の開始時にあなたは無料の増築ししないことを選んでもよい。そうした場合、その後は（小屋大工による）無料の増築はできない。</div>\
<div id="ja-text-179" title="179. 販売人"><p style="font-style:italic">コスト: なし</p>あなたは「小さい進歩」または「大きいまたは小さい進歩」のアクションを行うたび、食糧1を支払ってもう一度そのアクションを行える。<br>*「大きいまたは小さい進歩」のアクションを行う場合、大きい進歩を2回、小さい進歩を2回、大きい進歩と小さい進歩を1回ずつ、のいずれかが行える。<br>*たとえ同じ手番に複数の進歩をプレイしても、プレイしたすべての進歩について販売人の能力が起動する。（訳注：1回の手番中に複数回進歩をプレイするアクションを行った場合、販売人の能力を使うとそれら全体がもう1回行える、という意味かと思います。具体例は以下。）<br>*販売人と行商人(K281)を同時に使った場合、あなたは「大きいまたは小さい進歩」のアクションスペースで食糧1を支払って最大4つの小さい進歩をプレイできる。また、「小さい進歩」のアクションスペースで食糧1を支払って大きい進歩を2回プレイできる。<br>*販売人と商人(I228)を同時に使った場合、「スタートプレイヤー」のアクションスペースを使ったときにあなたはまず小さい進歩1回と大きいまたは小さい進歩1回を行い、さらに追加で食糧1を支払って小さい進歩2回か、大きい進歩と小さい進歩を1回ずつのどちらかを行える。<br>*最初の進歩で品物や食糧を得た場合、それらを販売人の能力のコストや、（販売人の能力で出す）2枚目の進歩のコストに充ててもよい。<br>*学者(K279)の能力で進歩を出すときも、販売人の能力が起動する。</div>\
<div id="ja-text-180" title="180. 小さい庭師"><p style="font-style:italic">コスト: なし</p>あなたはこのカードをプレイしたら野菜1を受け取る。その野菜を空いている畑にすぐに植えてもよい。<br>*小さい庭師の効果で種をまくアクションを行う場合、いま手に入れた野菜のみをまくことができる。<br>*小さい庭師の効果で野菜を植えるとき、畑農(I219)、小農夫(K286)、じゃがいも掘り(E32)、肥溜め(K118)、プランター(I90)および他のプレイヤーの畑作人(I224)の能力が起動する。<br>*野菜を植えるのはオプションである。</div>\
<div id="ja-text-181" title="181. コック"><p style="font-style:italic">コスト: なし</p>それぞれの収穫の食糧供給フェイズで、あなたの人々のうち2人だけが食糧2を必要とし、それ以外の人々は食糧1で満足する。</div>\
<div id="ja-text-182" title="182. 炭焼き"><p style="font-style:italic">コスト: なし</p>プレイヤーの誰か（あなたも含む）がかまど(A1/A2)、調理場(A3/A4)、調理コーナー(I85)、パン焼き部屋(I65)、パン焼き小屋(K106)および暖炉を作ったとき、あなたは食糧1と木材1を得る。<br>*あなたは、まだ建設されていない大きい進歩の上にリマインドとして食糧1と木材1を置いてもよい。<br>*進歩を改良して炭焼きの効果の対象となる進歩を手に入れた場合も、あなたは食糧と木材を受け取る。</div>\
<div id="ja-text-183" title="183. かご編み"><p style="font-style:italic">コスト: なし</p>収穫のたび、かご編みは葦最大1を食糧3に換えられる。</div>\
<div id="ja-text-184" title="184. 小売人"><p style="font-style:italic">コスト: なし</p>このカードの上に下から野菜、葦、レンガ、木材、野菜、石材、小麦、葦を順に積む。あなたはいつでも、食糧1を支払って一番上の品物を買える。</div>\
<div id="ja-text-185" title="185. レンガ焼き"><p style="font-style:italic">コスト: なし</p>あなたはいつでも、レンガ2を石材1に換えるか、またはレンガ3を石材2に換えられる。</div>\
<div id="ja-text-186" title="186. レンガ屋"><p style="font-style:italic">コスト: なし</p>あなたはいつでも、レンガ2を羊1または葦1に、レンガ3を猪1か石材1に、レンガ4を牛1に換えられる。<br>*あなたはレンガ屋で得た家畜を、即座に進歩で食糧に換えてもよい。このとき、農場内に空きスペースが無くてもよい。</div>\
<div id="ja-text-187" title="187. レンガ運び"><p style="font-style:italic">コスト: なし</p>ラウンド6から14の各スペースにそれぞれレンガ1を置く。これらのラウンドの開始時に、そのレンガを得る。<br>*現在のラウンドおよび、すでに経過しているラウンドのスペースにはレンガは置かれない。</div>\
<div id="ja-text-188" title="188. レンガ混ぜ"><p style="font-style:italic">コスト: なし</p>あなたの人々のアクションでレンガだけを取る場合、あなたは追加でレンガ2を得る。<br>*レンガが置かれているアクションスペースを使うたび、レンガ混ぜの能力が起動する。レンガが置かれていないアクションスペースでは、レンガ混ぜの能力は起動しない。(例：Bureaucrat(C07)をプレイしている場合)<br>*3人ゲームの「建築資材1つを取る」でレンガを取った場合にも、レンガ混ぜの能力は起動する。<br>*小さい進歩や職業でレンガを得た場合には、レンガ混ぜの能力は起動しない。<br>*アクションスペースからレンガ（だけ）を取ったのと同時に、職業や小さい進歩の効果で別の品物を受け取った場合であっても、レンガ混ぜの能力は起動する。</div>\
<div id="ja-text-189" title="189. 君主"><p style="font-style:italic">コスト: なし</p>ゲーム終了時、各カテゴリーについて最大の4点を獲得した場合、さらに追加で1点を得る。<br>*ボーナス点は、柵で囲まれた厩を4つ作った場合も与えられる。<br>*醸造所(K110)、火酒製造所(I98)など、他のカードによるボーナス点については君主(E189)のボーナス点計算の際には無視する。（訳注：純粋な素の得点で4点に到達していないと、君主のボーナス点は認められない、ということです。）</div>\
<div id="ja-text-190" title="190. メイド"><p style="font-style:italic">コスト: なし</p>レンガの家に改築し次第、それより後の各ラウンドのスペースに食糧1を置く。これらのラウンドの開始時に、その食糧を得る。<br>*あなたがこのカードをプレイする前にすでにレンガか石の家に改築済みであった場合、カードを出したらすぐにそれより後のラウンドのスペースに食糧を置く。</div>\
<div id="ja-text-191" title="191. 左官屋"><p style="font-style:italic">コスト: なし</p>ゲーム中、あなたの石の家の部屋数が4以上であればいつでも、無料で1部屋増築できる。<br>*このカードの上に部屋タイルを1枚置き、まだこのカードで増築していないことを示してもよい。<br>*左官屋による増築のとき、増築のアクションスペースを使う必要はない。</div>\
<div id="ja-text-192" title="192. パトロン"><p style="font-style:italic">コスト: なし</p>今後、職業をプレイするたび、あなたは職業のコストを支払う前に食糧2を得る。<br>*書き机(E49)とパトロンをプレイしている場合、（書き机の能力でプレイする）2枚目の職業のプレイ時にもパトロンから食糧を得る。<br>*本棚(K112)とパトロンをプレイしている場合、あなたは職業を出すたびに食糧5を得る。</div>\
<div id="ja-text-193" title="193. 牧師"><p style="font-style:italic">コスト: なし</p>このカードをプレイしたとき、もしくはそれ以降で、あなただけが部屋数2の場合、あなたは木材3、レンガ2、葦1、石材1を得る。<br>*牧師の効果を得るタイミングはあなたが決めてよいが、（あなた以外の）最後のプレイヤーが3つ目の部屋を作った後で、かつ、あなたが3つ目の部屋を作る前のタイミングでなければならない。</div>\
<div id="ja-text-194" title="194. 鋤職人"><p style="font-style:italic">コスト: なし</p>石の家に住み次第、各ラウンドの開始時に食糧1を支払って（最大で）畑1を耕してもよい。<br>*鋤職人の能力で畑を耕すときは、鋤類および馬鍬(I68)で複数の畑を耕すことはできない。<br>*（井戸などで）ラウンドの開始時に食糧を得た場合、その食糧を鋤職人の能力のコストに充ててもよい。</div>\
<div id="ja-text-195" title="195. 鋤鍛冶"><p style="font-style:italic">コスト: なし</p>「畑1を耕す」または「畑1を耕す そして 種をまく」のアクションスペースを使うたび、食糧1を支払えば追加で畑を1つ耕せる。<br>*鋤鍛冶（鋤職人(E194)ではない）と同時に、鋤類や馬鍬(I68)を使用してもよい。その場合、鋤類や馬鍬で耕せる畑の数に加えて、食糧1を支払えば追加で畑1を耕せる。（訳注：鋤鍛冶による追加の畑に対して鋤類、馬鍬の能力は適用できません。）</div>\
<div id="ja-text-196" title="196. キノコ探し"><p style="font-style:italic">コスト: なし</p>あなたの人のアクションでアクションスペースに置かれている木材を取った場合、そのスペースに木材1を残すかわりに食糧2を得てもよい。（訳注：5人ゲームの「葦1と石材1木材1」では、木材が「置かれていない」のでキノコ探しは使えない点に注意。）<br>*かご(E34)とキノコ探しを同時に使い、木材3を残せば食糧5を得る。<br>*アクションスペースに木材が1つしかない場合、(木材は取らずに)食糧2を得ることを選んでもよい。このとき、「木材を取る」行為は行ったとみなすため、イチゴ集め(E152)、木材荷車(I79)、出来高労働者(K268)の能力が起動する。<br>*アクションスペースに木材が1つもない場合(例：木材配り)、キノコ探しの能力は使えない。<br>*木材を含むアクションスペースであれば、キノコ探しの能力は起動する。(例：木材配り)</div>\
<div id="ja-text-197" title="197. ほら吹き"><p style="font-style:italic">コスト: なし</p>ゲーム終了時、あなたの前にある進歩の数でボーナス点を得る：9枚以上で9点、8枚で7点、7枚で5点、6枚で3点、5枚以下で1点。<br>*大きい進歩、小さい進歩の両方をカウントする。捨てられた進歩はカウントしない。</div>\
<div id="ja-text-198" title="198. ネズミ捕り"><p style="font-style:italic">コスト: なし</p>ラウンド10と12で、他のプレイヤーは全員、家族の子供1人を場に置けない。このカードはラウンド9までに出すこと。<br>*家にいる家族は、家族を増やすときの部屋数のチェックの際にはカウントすること。<br>*あなたは家族全員を場に置ける。<br>*「子供」とは、ゲームの最初からいる2人を除く家族全員のことである。新生児だけではない。<br>*ゲストおよび葦の家(K138)の住人は子供ではない。これらはネズミ捕りの制限を受けない。</div>\
<div id="ja-text-199" title="199. 改築屋"><p style="font-style:italic">コスト: なし</p>レンガの家に改築するときに支払うレンガを2つ減らす。また、石の家に改築するときに支払う石材を2つ減らす。</div>\
<div id="ja-text-200" title="200. 修理屋"><p style="font-style:italic">コスト: なし</p>あなたは、木の家を直接石の家に改築できる。レンガの家にする必要はない。<br>*修理屋と石打ち(K303)を同時に使い、または自分の手番でないときに修理屋とへら(E50)を同時に使い木の家を石の家に改築することはできない。<br>*石の家に改築するためのコストを通常通り支払うこと。また、修理屋の能力を使うために「改築」のアクションを実行する必要がある。<br>*修理屋で石の家に改築した場合でも、レンガ大工の能力は起動する。</div>\
<div id="ja-text-201" title="201. 牛使い"><p style="font-style:italic">コスト: なし</p>現在のラウンドに5と9を足す。それらのラウンドのスペースに牛1をそれぞれ置く。これらのラウンドの開始時に、その牛を得る。<br>*ソリティアゲームでこのカードがゲーム開始時にすでにプレイされている場合、現在のラウンドは0とする。あなたはラウンド5とラウンド9にそれぞれ牛1を得ることになる。<br>*手に入れた家畜は、即座に進歩で食料に換えてもよい。このとき、農場内に空きスペースが無くてもよい。</div>\
<div id="ja-text-202" title="202. 季節労働者"><p style="font-style:italic">コスト: なし</p>あなたは「日雇い労働者」のアクションスペースを使うたび、追加で小麦1を得る。ラウンド6以降は、小麦の代わりに野菜1でもよい。</div>\
<div id="ja-text-203" title="203. 羊飼い"><p style="font-style:italic">コスト: なし</p>各収穫フェーズの間、あなたの飼っている羊が4匹以上いれば、繁殖で受け取る羊が1匹ではなく2匹になる。ただし繁殖した家畜を置くスペースが必要。</div>\
<div id="ja-text-204" title="204. 羊飼い親方"><p style="font-style:italic">コスト: なし</p>これ以降3ラウンドのスペースに羊1をそれぞれ置く。これらのラウンドの開始時に、その羊を得る。<br>*手に入れた家畜は、即座に進歩で食料に換えてもよい。このとき、農場内に空きスペースが無くてもよい。</div>\
<div id="ja-text-205" title="205. 葦集め"><p style="font-style:italic">コスト: なし</p>これ以降4ラウンドのスペースに葦1をそれぞれ置く。これらのラウンドの開始時に、その葦を得る。</div>\
<div id="ja-text-206" title="206. ブタ飼い"><p style="font-style:italic">コスト: なし</p>あなたは「猪1」のアクションスペースを使うたび、共通のストックから追加で猪1を受け取る。<br>*「猪1」のアクションスペースはラウンド8、9で登場する。<br>*5人ゲームで、3種類の家畜から選んで1匹取るアクションスペースがある。このアクションスペースを使ったときは、ブタ飼いの能力は起動しない。</div>\
<div id="ja-text-207" title="207. 厩番"><p style="font-style:italic">コスト: なし</p>あなたは柵を1本以上作るたび、厩を1つ受け取り、それをすぐに建てなければならない。<br>*厩は柵の内側、外側どちらに建てても良い。<br>*厩を建てるために木材を支払う必要はない。<br>*小牧場(E40)をプレイしたとき、厩番の能力が起動する。<br>*1手番に受け取れる厩は1つまでである。<br>*柵見張り(K312)の能力起動時にも、厩番の能力が起動する。通常通り厩を建設し、それを柵見張りの能力で囲った後、あなたはもう1つ厩を手に入れ、それを建設しなければならない。2つめの厩については、柵見張りの能力を使用して柵で囲うことはできない。<br>*厩番の能力で置いた厩に対しても、柵見張りの能力が起動する。通常通り柵を作り、厩番の能力で厩を1つ置く。その厩を、柵見張りの能力によって柵で囲うことができる。この柵見張りの能力で置いた柵に対して、厩番の能力を起動してさらに無料の厩を受け取ることはできない。<br>*未建設の厩が1つもない場合、または厩を置く場所が1カ所もない場合は、厩番は何の効果もない。<br>*柵管理人(E175)を使った場合、追加で置く3つの柵で2つめの無料の厩を受け取ることはできない。</div>\
<div id="ja-text-208" title="208. 厩作り"><p style="font-style:italic">コスト: なし</p>あなたの持つ柵で囲まれていない厩のうちひとつに、同じ種類の家畜を3匹まで飼える。<br>*角笛(E29)と厩作りを一緒にプレイしている場合、柵で囲われていない厩については角笛は効果がない。</div>\
<div id="ja-text-209" title="209. 石持ち"><p style="font-style:italic">コスト: なし</p>あなたはいつでも、石材を食糧に換えられる。石材1ごとに食糧2となる。</div>\
<div id="ja-text-210" title="210. 石運び"><p style="font-style:italic">コスト: なし</p>あなたは人を使ったアクションで石材を取ったとき、石材1を追加で得る。他の建築資材も一緒に取る場合は、追加の石材のために食糧1を支払う。<br>*石材が置かれたアクションスペースを使った場合に、石運びの能力が起動する。石材を含まないアクションスペースでは石運びの能力は使えない。<br>*3人ゲームの「建築資材1つを取る」で石材を取った場合、石運びの能力が起動する。<br>*5人ゲームのアクションスペース「葦1と石材1木材1」と、4人ゲームのアクションスペース「葦1石材1食糧1」で石運びの能力を使う場合、食糧1を支払うこと。<br>*アクションスペースから石材を取ったタイミングで、職業や進歩の効果により石材以外の資材を受け取った場合、石運びの能力で追加の石材を得る場合は追加の食糧1が必要となる。<br>*職業や進歩の効果で石材を受け取った場合は、石運びの能力は起動しない。<br>*他の建築資材とは、木材、レンガ、葦のことをいう。</div>\
<div id="ja-text-211" title="211. 石切り"><p style="font-style:italic">コスト: なし</p>あなたは、すべての進歩、増築、改築に必要なコストから石材1を減らせる。<br>*たとえば、建築用木材(K107)をプレイする際にコストの石材を支払う必要はない。<br>*2部屋以上増築するとき、石切りの効果はそれぞれの部屋ごとに適用される。改築の場合は部屋数に関係なく、安くなるのは石材1のみ。<br>*あなたは、進歩のプレイや増築、改築のコストを変更する他のカードと石切りを同時に使っても良い。</div>\
<div id="ja-text-212" title="212. 踊り手"><p style="font-style:italic">コスト: なし</p>あなたは「小劇場」のアクションスペースで「小劇場」のアクションを行うたび、そのスペースに食糧が1〜3個しかない場合でも最低4つの食糧を得る。<br>*他のプレイヤーが「小劇場」のアクションで旅芸人(I237)の能力を使った場合、そのプレイヤーはあなたに食糧1を支払う。<br>*昔語り(E169)と踊り手を一緒にプレイしている場合、食糧1を「小劇場」のアクションスペースに残したときは最低4つの食糧および野菜1を得る。<br>*旅芸人(I237)と踊り手の能力を同時に使うことはできない。</div>\
<div id="ja-text-213" title="213. 家畜の世話人"><p style="font-style:italic">コスト: なし</p>2つめの厩を建てたら牛1を受け取る。3つめの厩を建てたら猪1を受け取る。4つめの厩を建てたら羊1を受け取る。<br>*1回で複数の厩を建てた場合、（条件を満たせば）複数の家畜を受け取っても良い。<br>*家畜の世話人をプレイした時点ですでに厩が2つ以上建っている場合、その分の家畜はもらえない。<br>*手に入れた家畜は、即座に進歩で食料に換えてもよい。このとき、農場内に空きスペースが無くてもよい。</div>\
<div id="ja-text-214" title="214. 陶工"><p style="font-style:italic">コスト: なし</p>収穫のたび、陶工はレンガ最大1つを食糧2に換えられる。</div>\
<div id="ja-text-215" title="215. 家畜小作人"><p style="font-style:italic">コスト: なし</p>あなたはただちに、それぞれの種類の家畜を1匹ずつ共通のストックから借りる。得点計算の前にこれら3匹の家畜は返す。返せなかった（または意図的に返さなかった）家畜については、1匹につき1点を失う。<br>*自由農夫(E165)を一緒にプレイしていた場合、返さなかった家畜の分のマイナス点は無効になる。<br>*家畜を返せずにマイナス点が発生した場合、村長(K276)のボーナス点は得られない。<br>*家畜の餌(I101)の効果で得た家畜を、家畜小作人で返却する家畜に充ててもよい。このとき、農場内に一時的な空きスペースがなくてもよい。<br>*得点計算の前であれば、家畜を返すのはいつ行ってもよい。返却は1度だけ行えばよい。</div>\
<div id="ja-text-216" title="216. 家畜守"><p style="font-style:italic">コスト: なし</p>あなたは、羊、猪、牛を同じ牧場で飼うことができる。<br>*この効果は、森の牧場(K145)を除くすべての牧場に対して有効。</div>\
<div id="ja-text-217" title="217. 代官"><p style="font-style:italic">コスト: なし</p>あなたはこのカードをプレイしたらすぐに木材を得る：ラウンド12〜13にプレイしたら木材1、ラウンド9〜11なら木材2、ラウンド6〜8なら木材3、ラウンド6より前なら木材4。ゲーム終了時、職業を最も多くプレイしているプレイヤーは全員、3点のボーナス点を得る。<br>*大学者(E148)は職業2つ分として数える。</div>\
<div id="ja-text-218" title="218. 大工"><p style="font-style:italic">コスト: なし</p>増築するとき、あなたは対応する建築資材3つと葦2で増築できる。<br>*たとえば、あなたが木の家に住んでいる場合、木材3と葦2で増築できる。<br>*2部屋以上増築する場合、それぞれの部屋に大工の効果を適用できる。<br>*大工と一緒にレンガの柱(E37)、斧(E13)、レンガ積み(I241)のいずれかをプレイしている場合、増築時にこれらのカードのうち1つを選んで効果を適用する。2部屋以上増築する場合、それぞれの部屋ごとに異なるカードの効果を適用できる。<br>*大工の効果を適用後、さらにレンガの屋根(E36)、はしご(I91)、わら小屋(I99)、柴屋根(K136)、屋根がけ(E157)、石切り(E211)、レンガ貼り(I243)、梁打ち(K272)、柴結び(K294)、彫刻家(K301)を使用して増築コストを変更できる。<br>*たとえば、レンガ貼り(I243)を一緒にプレイしていた場合、あなたは大工とレンガ貼りの効果を両方適用して、レンガ1と葦2でレンガの部屋を増築できる。<br>*木の家増築(I81)、レンガの家増築(K132)の増築コストを変更しても良いが、そのときは必要な葦は2つに増えることに注意せよ。</div>\
<div id="ja-text-219" title="219. 畑農"><p style="font-style:italic">コスト: なし</p>種をまくとき、まく畑が1つならば同じ種類の作物を重ねて2つ置く。まく畑が2つならば、それぞれの畑に作物を1つずつ重ねて置く。<br>*3つ以上の畑にまく場合は、追加の作物は得られない。<br>*林務官(K278)、雑木林(I78)、レタス畑(E47)、マメ畑(E18)、カブ畑(K137)、平地(K105)にも追加の作物を置くことができる。<br>*平地に2つの作物を植える場合は、畑2つとして数える。林務官は最大3つの畑として数える。Scarecrow(Z324)で1つの畑に2つの作物を植えた場合は、畑2つとして数える。<br>*小さい庭師(E180)や乾燥小屋(I86)の能力で種をまくときにも、畑農の能力は起動する。</div>\
<div id="ja-text-220" title="220. 井戸掘り"><p style="font-style:italic">コスト: なし</p>あなたにとって井戸(A10)は小さい進歩になり、さらに建設コストが石材1と木材1になる。<br>*村の井戸(I66)にアップグレードした後に井戸は再び建設可能となるが、2度目の井戸建設でも井戸掘りの恩恵は受けられる。</div>\
<div id="ja-text-221" title="221. 村の長老"><p style="font-style:italic">コスト: なし</p>あなたはこのカードをプレイしたらすぐに木材を得る：ラウンド12〜13にプレイしたら木材1、ラウンド9〜11なら木材2、ラウンド6〜8なら木材3、ラウンド6より前なら木材4。ゲーム終了時、進歩カードを最も多く場に出しているプレイヤーは全員、3点のボーナスを得る。<br>*大きい進歩、小さい進歩の両方をカウントする。捨てられた進歩はカウントしない。</div>\
<div id="ja-text-222" title="222. 成り上がり"><p style="font-style:italic">コスト: なし</p>あなたがレンガの家または石の家に改築した最初のプレイヤーである場合、それぞれ石材3を得る。2番目なら石材2、3番目なら石材1を得る。<br>*このカードをプレイする前に行った改築については、成り上がりの効果は適用されない。<br>*改築後に成り上がりの効果で受け取った石材は、連続して行う「大きいまたは小さい進歩」のアクションに使用できる。</div>\
<div id="ja-text-223" title="223. 収穫手伝い"><p style="font-style:italic">コスト: なし</p>収穫の食糧供給フェイズの開始時に、あなたは他のプレイヤー1人の畑に植えられた小麦1つを取れる。そのプレイヤーは共通のストックから食糧2を受け取る。<br>*収穫手伝いで自分の畑から小麦を取ることはできない。<br>*他のプレイヤーの平地(K105)に植えられた小麦を収穫してもよい。<br>*収穫手伝いの能力は乾燥小屋(I86)の後に起動する。<br>*他のプレイヤーが持つ小麦畑が複数あるとき、どの小麦畑から収穫するかはあなたが決める。</div>\
<div id="ja-text-224" title="224. 畑作人"><p style="font-style:italic">コスト: なし</p>他のプレイヤーが種をまくとき、あなたは3人ゲームなら小麦1を、4-5人ゲームなら食糧1を得る。<br>*あなたが種をまくとき、畑作人の恩恵は得られない。<br>*他のプレイヤーが小さい庭師(E180)や乾燥小屋(I86)の能力で種をまいたときも、畑作人の能力は起動する。</div>\
<div id="ja-text-225" title="225. 畑番"><p style="font-style:italic">コスト: なし</p>あなたは「小麦1を取る」のアクションスペースを使うたび、畑1を耕せる。<br>*このカードの効果で畑を耕すときは、鋤類や馬鍬(I68)は使えない。</div>\
<div id="ja-text-226" title="226. 庭師"><p style="font-style:italic">コスト: なし</p>収穫のとき、あなたは野菜を畑から収穫せずに共通のストックから取る。畑の野菜はそのままにしておく。<br>*あなたの野菜畑はゲーム終了時まで変化しなくなる。これはマメ畑(E18)、カブ畑(K137)、レタス畑(E47)についても同様。<br>*庭師の能力はオプションではない。</div>\
<div id="ja-text-227" title="227. 共同体長"><p style="font-style:italic">コスト: なし</p>あなたはこのカードをプレイしたらすぐに木材を得る：ラウンド12〜13にプレイしたら木材1、ラウンド9〜11なら木材2、ラウンド6〜8なら木材3、ラウンド6より前なら木材4。ラウンド14に少なくとも5人の人々をアクションに参加させていれば、ゲーム終了時にボーナス3点を得る。<br>*ゲストによるアクションもカウントする。営農家(K289)や曲芸師(K269)による追加のアクションはカウントしない。<br>*ラウンド14で5人目の家族を作ったプレイヤーはボーナス点をもらえない。ただし、養父母(K267)の能力を使い5人目の家族でアクションを行った場合は、ボーナス点をもらえる。<br>*別荘(I71)を建てたプレイヤーは、共同体長のボーナス点はもらえない。</div>\
<div id="ja-text-228" title="228. 商人"><p style="font-style:italic">コスト: なし</p>あなたは「スタートプレイヤー」のアクションスペースを使うたび、小さい進歩のあとに追加で小さい進歩または大きい進歩を行える。<br>*オプション：この能力は1手番につき1度しか行えない。<br>*商人と行商人(K281)の能力を同時に使った場合、あなたは「スタートプレイヤー」のアクションスペースを使ったときに小さい進歩を3枚プレイすることができる。<br>*商人と販売人(E179)の能力を同時に使った場合、あなたは「スタートプレイヤー」のアクションスペースを使ったときに、まず小さい進歩1枚と大きい進歩1枚を、続けて食糧1を払えば小さい進歩2枚か小さい進歩と大きい進歩を1枚ずつプレイすることができる。<br>*小さい進歩をプレイせずに大きい進歩をプレイすることはできない。</div>\
<div id="ja-text-229" title="229. ごますり"><p style="font-style:italic">コスト: なし</p>「小麦1を取る」のアクションスペースを使う他のプレイヤーは、あなたに食糧1を支払わなければならない。さらに、あなたは共通のストックから食糧1を受け取る。あなた自身が「小麦1を取る」のアクションを行う場合にも、共通のストックから食糧1を受け取る。<br>*Iデッキには、「小麦1を取る」のアクションスペース使うのを避けられるカードが十分にあることに注意せよ。（訳注：進歩や職業などを使って他に小麦を得る手段があるので、ごますりで思うように「小麦1を取る」アクションを踏んでもらえないケースも出てくる、ということ）<br>*食糧はアクションスペースを使う前に支払う必要がある。支払う食糧がない場合は、「小麦1を取る」のアクションスペースは使えない。物乞いカードを取って、食糧1に代えることはできない。<br>*あなた自身が「小麦1を取る」のアクションスペースを使うときは、食糧の支払いは不要である。</div>\
<div id="ja-text-230" title="230. 穴掘り"><p style="font-style:italic">コスト: なし</p>3人ゲームの「レンガ1」のアクションカードを追加で場におき、すぐにレンガ3をこのカードの上に置く。また、各ラウンドの最初にこのカードの上にレンガ1を追加する。このアクションスペースを使うプレイヤーはあなたに食糧3を支払う。<br>*あなた自身が穴掘り(で追加されたアクションスペース)を使う場合、食糧の支払いは不要である。</div>\
<div id="ja-text-231" title="231. 召使"><p style="font-style:italic">コスト: なし</p>あなたは石の家を建てたら、以降のラウンドのスペースにそれぞれ食糧3を置く。これらのラウンドの開始時に、その食糧を得る。<br>*このカードを出した時にすでに石の家に改築済みの場合、すぐに以降のラウンドのスペースに食糧を置く。</div>\
<div id="ja-text-232" title="232. 産婆"><p style="font-style:italic">コスト: なし</p>他のプレイヤーが家族を増やしたとき、あなたより家族の人数が多ければ、あなたは食糧1を得る。あなたより2人以上家族が多ければ、あなたは食糧2を得る。<br>*食糧は他のプレイヤーから受け取らず、共通のストックから取る。<br>*他のプレイヤーが乳母(K270)、愛人(K291)、Village Beauty(Z325)の能力を使ったとき、産婆の能力が起動する。<br>*他のプレイヤーがゲストを獲得したとき、または葦の家(K138)をプレイしたときは、産婆の能力は起動しない。<br>*ゲストおよび、葦の家の住人は家族の人数を数える際にはカウントしない。</div>\
<div id="ja-text-233" title="233. 農場管理"><p style="font-style:italic">コスト: なし</p>レンガか石の家に住み次第、次に行う「家族を増やす」のアクションは「家族を増やす 部屋がなくてもよい」として扱う。<br>*次の「家族を増やす」アクションは、ステージ5の「家族を増やす 部屋がなくてもよい」のアクションを行ったかのようにふるまう。それより後の「家族を増やす」アクションは、通常通りとなる。<br>*部屋がなくても増やせる家族は高々1人である。<br>*その後部屋を増やした場合、部屋がなかった家族はすぐに空き部屋に割り当てられる。<br>*すでにレンガか石の家に住んでいる場合、農場管理を場に出した以降の次の「家族を増やす」アクションについて、農場管理の効果を適用する。<br>*あなたの次の「家族を増やす」アクションが「家族を増やす その後で 小さい進歩」であった場合、あなたは通常通り小さい進歩をプレイしてよい。<br>*あなたの次の「家族を増やす」アクションが「家族を増やす 部屋がなくてもよい」であった場合、または愛人(K291)をプレイして家族を増やした場合、農場管理は何の効果もなくなる。<br>*乳母(K279)、Village Beauty(Z325)の能力の使用は「家族を増やす」アクションとして扱う。</div>\
<div id="ja-text-234" title="234. 材木買い付け人"><p style="font-style:italic">コスト: なし</p>他のプレイヤーがアクションで木材を受け取るたび、あなたはその中から木材1を食糧1で（相手の同意なしに）買える。<br>*買ってもよいのは1手番につき木材1まで。<br>*他のプレイヤーはこの交換を拒否できない。<br>*他のプレイヤーがかご(E34)、キノコ探し(E196)、猪猟師(I253)の能力で木材をすべてアクションスペースに残した場合、あなたは木材の買い付けができない。<br>*木材を含むアクションスペースを使った場合、材木買い付け人の能力の対象となる。例：木材配り<br>*5人ゲームの「葦1と石材1木材1」のアクションスペースも材木買い付け人の能力の対象となる。また、3人ゲームの「任意の資材1つを取る」で木材を取った場合も同様。<br>*小さい進歩や職業で木材を受け取った場合、材木買い付け人の能力は起動しない。<br>*取った木材が1つだけのときにそれを買い付けられたとしても、「木材を取る」という行為は行ったと考えてよい。つまり、イチゴ集め(E152)、木こり(E176)、出来高労働者(K268)などの効果を得てよい。しかし、資材商人(K310) は使えない。なぜなら、なぜなら、唯一の木材を買い付けられてしまった場合、木材を実際に "受け取って" いないからである。</div>\
<div id="ja-text-235" title="235. 木材集め"><p style="font-style:italic">コスト: なし</p>これ以降の5ラウンドのスペースにそれぞれ木材1を置く。これらのラウンドの開始時に、その木材を得る。</div>\
<div id="ja-text-236" title="236. 小作人"><p style="font-style:italic">コスト: なし</p>ゲーム終了時、未使用の農場スペース1つにつき食糧1を支払えばマイナス点にならない。<br>*小作人によって相殺されたマイナス点は、村長(K276)のマイナス点チェックの際にはマイナス点とはみなさない。 (訳注：未使用の農場スペースによるマイナス点をすべて小作人の効果で相殺し、それ以外にマイナス点がない盤面ならば村長ボーナスの対象です。)</div>\
<div id="ja-text-237" title="237. 旅芸人"><p style="font-style:italic">コスト: なし</p>あなたが「小劇場」のアクションスペースを使用して「小劇場」のアクションを行うとき、そこに置いてある食糧の2倍を得ることができる。そうした場合、あなたは魔術使い(K311)、奇術師(E167)、街頭の音楽家(I257)、人形使い(I249)、曲芸師(K269)、踊り手(E212)、猛獣使い(K342)、昔語り(E169)の所有者にそれぞれ食糧1を支払う。<br>*旅芸人と踊り手(E212)の能力を同時に使用することはできない。<br>*アクションスペースに置かれている食糧だけが2倍になる。アクションスペースから食糧を取り、同じ数だけ共通のストックから食糧を取ること。<br>*他のプレイヤーに食糧を支払うのは、該当する職業が場に出ている場合に限る。<br>*あるプレイヤーが食糧の支払いに該当する職業を複数枚プレイしていた場合、その枚数分だけ食糧を支払う。<br>*あなた自身が食糧の支払いに該当する職業をプレイしていた場合は、食料を支払う必要はない。<br>*あなたが受け取った食糧より多くの支払いが発生する可能性もある。<br>*旅芸人の能力の使用はオプションである。2倍の食糧を得ることをしなかった場合、他のプレイヤーに対する食糧の支払いも不要。<br>*他のプレイヤーに支払う食糧が足りない場合、あなたは旅芸人の能力を使用できない。</div>\
<div id="ja-text-238" title="238. 収入役"><p style="font-style:italic">コスト: なし</p>ラウンド11の開始時(または、あなたがこのカードをラウンド11以降にプレイした場合にはただちに)、残りのラウンドのラウンドカードを表にする。あなただけは、ただちにこれらのアクションを行える。他のプレイヤーは通常通り、使用可能なラウンドになるまで待たねばならない。<br>*「畑1を耕す そして 種をまく」と「家族を増やす 部屋がなくてもよい」のアクションスペースの登場順は、収入役の効果でカードが表になった時点で決定される。</div>\
<div id="ja-text-239" title="239. 脱穀職人"><p style="font-style:italic">コスト: なし</p>あなたはいつでも、小麦1を食糧3にできる。他のプレイヤーはあなたに食糧2を支払いその小麦を買い付けることで、これを妨害できる。複数のプレイヤーが名乗り出た場合は、あなたが指名する。<br>*脱穀職人の使用は「パンを焼く」ではない。</div>\
<div id="ja-text-240" title="240. 牛の飼育士"><p style="font-style:italic">コスト: なし</p>あなたは「牛1」のアクションスペースを使うたび、共通のストックから追加で牛1を得る。<br>*「牛1」のアクションスペースはラウンド10または11で登場する。<br>*5人ゲームで登場する、家畜を得るアクションスペースを使った場合は牛の飼育士の能力は起動しない。</div>\
<div id="ja-text-241" title="241. レンガ積み"><p style="font-style:italic">コスト: なし</p>木の家をレンガの家に改築するコストはレンガ1と葦1でよい。レンガの家を増築するコストはレンガ3と葦2でよい。<br>*レンガ積みとレンガの柱(E37)や大工(E218)を一緒にプレイしていた場合、あなたはこれらのカードの効果のうち1枚を選んで適用してよい。2部屋以上増築する場合は、部屋ごとにどのカードの効果を適用するかどうかを選んでもよい。<br>*あなたは、レンガ積みの能力でレンガの家増築(K132)のコストを変更しても良いが、その場合は必要な葦は2つになる。<br>*レンガ積みの能力を使用後、さらにレンガの屋根(E36)、はしご(I91)、わら小屋(I99)、柴屋根(K136)、屋根がけ(E157)、レンガ貼り(I243)、梁打ち(K272)、柴結び(K294)の能力を使用し増築のコストを変更できる。<br>*たとえば、レンガ貼り(I243)を一緒にプレイしていた場合、葦1でレンガの家に改築できる。また、レンガ1と葦2でレンガの家を増築できる。</div>\
<div id="ja-text-242" title="242. レンガ大工"><p style="font-style:italic">コスト: なし</p>レンガの家に住み次第、以降の5ラウンドのスペースにレンガ2をそれぞれ置く。これらのラウンドの開始時に、それらのレンガを得る。<br>*このカードをプレイした時点でレンガの家または石の家に住んでいる場合、ただちに次ラウンド以降5ラウンド分のスペースにレンガ2をそれぞれ置く。<br>*修理屋(E200)で石の家に改築した場合も、レンガ大工の能力は起動する。</div>\
<div id="ja-text-243" title="243. レンガ貼り"><p style="font-style:italic">コスト: なし</p>進歩や改築のコストは、それぞれレンガ1つ分少なくなる。増築の場合は、部屋1つごとにレンガ2つ分少なくなる。<br>*たとえば、レンガ貼りを場に出しているときに親切な隣人(E42)を使うと、葦1または石材1を無料でもらえる。<br>*レンガ積み(I241)を一緒にプレイしている場合、2つのカードの効果を同時に適用してよい。つまり、レンガの家への改築は葦1でよい。また、レンガの家を増築するコストはレンガ1と葦2でよい。大工(E218)とレンガ貼りを一緒にプレイしている場合も同様に、レンガ1と葦2で増築できる。また、レンガの柱とレンガ貼りを一緒にプレイしている場合も同様に、レンガの家を増築するコストは木材1と葦1でよい。<br>*同一アクション内で、レンガ貼りと、進歩、増築、改築のコストを変更できる他のカードを組み合わせても良い。<br>*増築のコストがレンガ1になっている場合、レンガ貼りはそのコストを0にする。例：レンガ積みと梁打ち(K272)を組み合わせると、レンガ1で増築可能。<br>*レンガの家増築(K132)のコストは、レンガ2つ分安くなる。</div>\
<div id="ja-text-244" title="244. 居候"><p style="font-style:italic">コスト: なし</p>あなたは、このカードをプレイしたあとの次の収穫フェイズを行わない。<br>*次の収穫フェイズでは、畑フェイズも繁殖フェイズも含めいっさいのアクションを行わない。収穫のタイミングで効果を発揮するカードの効果も使えない。<br>*他方、あなたは収穫フェイズ出発生する家族への食糧供給も必要ない。<br>*他のプレイヤーは、次の収穫フェイズの間にあなたの水車(I103)を使っても良い。<br>*堆肥(I92)の使用は、収穫フェイズとはみなさない。（訳注：居候を使っていても堆肥で収穫できる、という意味かと思います）</div>\
<div id="ja-text-245" title="245. てき屋"><p style="font-style:italic">コスト: なし</p>あなたが「小麦1を取る」のアクションスペースを使ったとき、あなたは小麦1と野菜1を追加で取ることができる。これを行った場合、他のプレイヤーは共通のストックから小麦1を得る。</div>\
<div id="ja-text-246" title="246. 乳搾り"><p style="font-style:italic">コスト: なし</p>収穫の畑フェイズで、あなたは牛5匹を飼っていれば食糧3、3匹または4匹のとき食糧2、1匹または2匹のとき食糧1を得る。ゲーム終了時、あなたは牛2匹ごとにボーナス点1点を得る。</div>\
<div id="ja-text-247" title="247. 精肉屋"><p style="font-style:italic">コスト: なし</p>あなたはいつでも家畜を食糧にできる。羊1匹につき食糧1、猪は食糧2、牛は食糧3。<br>*精肉屋を使えば、あなたは調理系の進歩カードなしで家畜を食糧にできる。<br>*収穫の繁殖フェイズの間は、あなたは家畜を食糧にできない。最後の収穫の繁殖フェイズの後はすぐにゲーム終了となるため、あなたは最後の繁殖で増えた家畜を食糧にすることはできない。</div>\
<div id="ja-text-248" title="248. 網漁師"><p style="font-style:italic">コスト: なし</p>あなたの人々のうち誰かが葦を供給するアクションスペースを使った場合、あなたは帰宅フェイズ(フェイズ4)で「漁」のアクションスペースにある食糧を全部取る。<br>*葦を含むアクションスペースに人を置いたとき、あなたは権利マーカーを「漁」のアクションスペースに置く。<br>*権利が発生したラウンドの帰宅フェイズまでの間に誰かが「漁」のアクションスペースに入り食糧を取った場合、あなたは何も得られない。<br>*葦の交換(I96)や親切な隣人(E42)、その他の葦を獲得できる進歩カードや職業カードでは、網漁師の能力は起動しない。<br>*網漁師の能力で食糧を回収する行為は「漁」のアクションとはみなさない。したがって、漁師(E161)、釣竿(E12)、梁(I95)、いかだ(E22)、カヌー(E30)の能力は起動しない。<br>*網漁師の能力では「漁」のアクションスペースから食糧のみを取ることができ、それ以外の資材は取れない。例：木材配り(K284)<br>*このカードをプレイしたラウンドについて、網漁師のプレイより後に葦を取った場合に限り「漁」のスペースから食料を取る権利を得て良い。</div>\
<div id="ja-text-249" title="249. 人形使い"><p style="font-style:italic">コスト: なし</p>他のプレイヤーがアクションスペースで「小劇場」のアクションを行うたび、あなたは食糧1を支払い職業カードをプレイして良い。<br>*あなたは共通のストックに食糧1を支払う。<br>*食糧が手元にある場合に、職業カードを1枚だけプレイして良い。プレイした職業の効果で食糧が即座に手に入る場合であっても、まず職業をプレイするための食糧1が必要。<br>*旅芸人(I237)の能力を使って「小劇場」のアクションを行ったプレイヤーは、食糧1をあなたに支払う。あなたは人形使いの能力を使用する前にこの食糧を受け取る。<br>*人形使いの能力で職業を出したとき、パン焼き棒(K111)の能力が起動する。</div>\
<div id="ja-text-250" title="250. 羊使い"><p style="font-style:italic">コスト: なし</p>現在のラウンドに4, 7, 9, 11 を加え、それらのラウンドのスペースに羊1をそれぞれ置く。これらのラウンドの開始時に、あなたはその羊を得る。<br>*ソリティアゲームのスタート時にこのカードがすでにプレイされている場合、現在のラウンドは0とみなす。あなたは、4, 7, 9, 11 ラウンドに羊を得る。<br>*あなたは、手に入れた家畜を即座に進歩で食料に換えても良い。このとき、農場に家畜を置くスペースが無くても良い。</div>\
<div id="ja-text-251" title="251. 葦買い付け人"><p style="font-style:italic">コスト: なし</p>このラウンドで最初に取られた葦について、あなたは葦を取ったプレイヤーから食料1でその葦を買ってもよい。そのプレイヤーは共通のストックから食料1を追加で取る。<br>*葦を買われる側のプレイヤーは、この交換を拒否できない。<br>*あなた自身がこのラウンドで最初に葦を取った場合、葦買い付け人の効果は得られない。（訳注：仮想的に自分で自分に葦を売ったことにして、共通のストックから食料1を得ることはできません。）<br>*ラウンドの2回目（以降）に取られた葦については、葦買い付け人で買い付けることはできない。あなたがラウンド内で最初の葦を取ったとしても同じ。<br>*葦が置かれているアクションスペースおよび、4人ゲームの「葦1石材1食料1」のアクションスペースを使ったとき、葦買い付け人の能力が起動する。<br>*他のプレイヤーが小さい進歩や職業の効果で得た葦については、葦買い付け人の能力は使えない。<br>*取った葦が1つだけのときにそれを買い付けられたとしても、「葦を取る」という行為は行ったと考えてよい。つまり、柄付き網(K126)、出来高労働者(K268)、梁(I95)などの効果を得てよい。しかし、資材商人(K310) は使えない。なぜなら、なぜなら、唯一の葦を買い付けられてしまった場合、葦を実際に "受け取って" いないからである。</div>\
<div id="ja-text-252" title="252. 猪飼い"><p style="font-style:italic">コスト: なし</p>あなたの猪はラウンド12の終了時にも繁殖する。ただし繁殖のためのスペースは必要。このカードをプレイしたらすぐに猪1を得る。<br>*このカードをプレイしたときに受け取った猪は、即座に進歩で食料に換えても良い。このとき、農場内に猪を置くための空きスペースが無くても良い。</div>\
<div id="ja-text-253" title="253. 猪猟師"><p style="font-style:italic">コスト: なし</p>あなたはアクションスペースから木材を取るとき、木材を2つ残して代わりに猪を受け取ることができる。<br>*アクションスペースにある木材が2つに満たない場合、あなたは猪猟師の能力を使うことはできない。木材荷車(I79)などで追加の木材を得る場合も同様。<br>*アクションスペースに木材がちょうど2つしかない場合、猪猟師の能力を使うことができる。その場合、猪1匹を受け取り、木材はそのままとなる。このとき、「木材を取る」行為は行ったとみなす。たとえば、イチゴ集め(E152)、木材荷車、出来高労働者(K268)の能力は起動する。<br>*木材を含むアクションスペースであれば、猪猟師の能力は使用できる。たとえば、木材配り(K284)で木材を配った場合。<br>*あなたは、得た猪を即座に進歩で食料に換えても良い。このとき、農場内に猪を置くための空きスペースが無くても良い。</div>\
<div id="ja-text-254" title="254. 馬手"><p style="font-style:italic">コスト: なし</p>石の家を手に入れたら、あなたはラウンドの開始時に木材1を支払い厩を1つ建てて良い。このとき、家族は必要ない。<br>*個人の森(E45)、木材集め(I235)、木材運び(K283)でラウンドの開始時に木材を受け取った場合、その木材を厩の建設コストに充てても良い。<br>*馬手の能力で厩を建てたとき、柵見張りの能力が起動する。</div>\
<div id="ja-text-255" title="255. 石買い付け人"><p style="font-style:italic">コスト: なし</p>このラウンドで最初に取られた石材について、あなたは石材を取ったプレイヤーから食料1でその石材を買ってもよい。そのプレイヤーは共通のストックから食料1を追加で取る。<br>*石材を渡す側のプレイヤーは、この交換を拒否できない。<br>*あなた自身がこのラウンドで最初に石材を取った場合、石買い付け人の効果は得られない。（訳注：仮想的に自分で自分に石材を売ったことにして、共通のストックから食料1を得ることはできません。）<br>*ラウンドの2回目や3回目に取られた石材については、石買い付け人で買い付けることはできない。あなたがラウンド内で最初の葦を取ったとしても同じ。（訳注：葦は誤植で、石材が正しいと思われます）<br>*毎ターン石材が置かれるアクションスペース、4人ゲームの「葦1石材1食糧1」アクションスペース、5人ゲームの「葦1と石材1木材1」アクションスペースを誰かが使ったとき、石買い付け人の能力が起動する。<br>*他のプレイヤーが小さな進歩や職業の効果で石材を得たときは、石買い付け人の能力は使えない。<br>*取った石材が1つだけのときにそれを買い付けられたとしても、「石材を取る」という行為は行ったと考えてよい。つまり、石運び(E210)、倉庫番(K288)、出来高労働者(K268)などの効果を得てよい。しかし、資材商人(K310) は使えない。なぜなら、唯一の石材を買い付けられてしまった場合、石材を実際に "受け取って" いないからである。</div>\
<div id="ja-text-256" title="256. 石工"><p style="font-style:italic">コスト: なし</p>収穫のたび、石工は石材最大1を食料3にできる。</div>\
<div id="ja-text-257" title="257. 街頭の音楽家"><p style="font-style:italic">コスト: なし</p>他のプレイヤーがアクションスペースで「小劇場」のアクションを行うたび、あなたは小麦1を得る。<br>*旅芸人(I237)の能力を使って「小劇場」のアクションを行ったプレイヤーは、あなたに食料1を支払う。</div>\
<div id="ja-text-258" title="258. 家具職人"><p style="font-style:italic">コスト: なし</p>収穫のたび、家具職人は木材最大1を食料2に換えられる。</div>\
<div id="ja-text-259" title="259. 家畜追い"><p style="font-style:italic">コスト: なし</p>「羊1」「猪1」「牛1」のアクションスペースを使うたび、食料1を支払って同じ種類の家畜を追加で一匹得る。<br>*「羊1」のカードはラウンド1-4で、「猪1」はラウンド8-9で、「牛1」はラウンド10-11で登場する。<br>*5人ゲームの「羊1＋食料1 または 猪1 または 食料1を支払い牛1」のアクションスペースでは、家畜追いの能力は使えない。<br>*食料1を支払った後、あなたは手に入れた家畜を進歩で即座に食糧に換えても良い。ただし、食料は必ず先に払うこと。支払いコストとの差分の食料だけを受け取ることはできない。</div>\
<div id="ja-text-260" title="260. 毒見役"><p style="font-style:italic">コスト: なし</p>他のプレイヤーがスタートプレイヤーのとき、あなたは食料1をスタートプレイヤーに支払い、そのスタートプレイヤーより先に家族を1人置ける。その後、通常通りスタートプレイヤーからプレイを始める。<br>*たとえば、あなたの右隣のプレイヤーがスタートプレイヤーであるとする。あなたはそのスタートプレイヤーに食料1を支払い、最初に家族を置く。以降は、通常のゲーム進行に従い右隣のプレイヤーが2番目に家族を置き、あなたが3番目の家族を置く。<br>*あなた自身がスタートプレイヤーの場合、毒見役の能力は使えない。<br>*木材配り(K284)、職場長(K308)、毒見役はお互いの能力の起動に反応して能力を使用しても良い。職業の能力を使うことを決めたプレイヤーは、その決定を覆せない。職業の能力を使わずに保留しているプレイヤーは、労働フェイズ(フェイズ3)の開始時までなら考え直せる。</div>\
<div id="ja-text-261" title="261. 乗馬従者"><p style="font-style:italic">コスト: なし</p>あなたは最も新しいラウンドカードのアクションを行うたび、小麦1を得る。<br>*あなたは、アクションの実行前に小麦を受け取る。たとえば、種をまくアクションを行うとき、乗馬従者で得た小麦をすぐに畑に蒔ける。<br>*収入役がプレイされていても、最新のラウンドカードは現在のラウンドを指す。</div>\
<div id="ja-text-262" title="262. 水運び"><p style="font-style:italic">コスト: なし</p>誰かが井戸(A10)を作ったら、その後のラウンドスペースすべてに食料1を置く。これらのラウンドの開始時に、あなたはその食料を得る。<br>*このカードを出した時点で井戸がすでにできている場合、すぐに現在より後のラウンドスペースに食料を置く。<br>*井戸を村の井戸(I66)に改良したときには食料は置かれない。ただし、その後井戸を再び誰かが立てたら、(水運びの効果が再び起動し)食料が置かれる。水運びを出した時に井戸がすでに村の井戸に改良され、井戸が大きい進歩置き場にある場合も食料は置かれる。</div>\
<div id="ja-text-263" title="263. 柵立て"><p style="font-style:italic">コスト: なし</p>このカードをプレイしたら、アクションスペースをひとつ選び、あなたの柵を1本そこに置く。このアクションスペースをあなたが使うたび、あなたは通常のアクションに加えて柵の建設ができる。<br>*今後は、柵建設に使える柵は14本となる。<br>*アクションスペースの通常のアクションは実行しなければならない。柵建設はオプションである。<br>*未来のラウンドのアクションスペースに柵を置いてもよい。ただし、そのアクションスペースを使わないと追加の柵建設アクションは実行できない。<br>*牧場は開いた形にはできない。(ルールどおり、四方を柵で囲むこと)<br>*柵立てによる追加のアクションで柵を立てた場合も、柵管理人(E175)、農場主(E160)、厩番(E207)、家畜飼い(K307)の能力は起動する。<br>*柵のあるアクションスペースが木材配り(K284)によって空になってしまった場合でも、あなたがそのアクションスペースを使えば柵を立てるアクションは行える。</div>\
<div id="ja-text-264" title="264. 柵作り"><p style="font-style:italic">コスト: なし</p>他のプレイヤーが柵を1〜4本立てた場合、あなたは共通のストックから木材1を受け取る。5本以上の柵を立てた場合は、木材2を受け取る。<br>*あなた自身が柵を立てたときは、柵作りの能力は起動しない。<br>*他のプレイヤーが、柵管理人(E175)などで1アクションで2回柵を作った場合、あなたは木材を1回だけ受け取れる。そのときは、合計で立てた柵の本数を計算の基準とする。</div>\
<div id="ja-text-265" title="265. 柵運び"><p style="font-style:italic">コスト: なし</p>現在のラウンドに6と10を足し、それらのラウンドのスペースに柵4本をそれぞれ置く。これらのラウンドの開始時に、あなたは食料2を払ってその場で4本の柵すべてを立てることができる。<br>*このカードを出したときに未使用の柵が8本より少なかった場合、後のラウンドの方におく柵は4本より少なくなる。もし未使用の柵が4本より少なかった場合、先のラウンドの方に残りすべての柵を置く。<br>*ラウンドスペースの上に置いた柵は、通常の柵建設で使用するために取り除くことができない。<br>*柵を立てるとき、4本を使いきらなくても良い。ただし、柵を1本でも立てるなら食料2が必要。使わなかった柵は、自分のストックに戻る。<br>*柵を立てる際に木材を払う必要はない。<br>*(柵建設のルールどおり)牧場が開いた状態にしてはいけない。<br>*柵を立てると、柵管理人の能力が起動する。<br>*ラウンドの開始時に受け取った食料は、柵建設のための食料支払いコストに使える。<br>*ソリティアゲームでこのカードがゲーム開始時に場に出ている場合、現在のラウンドは0である。あなたは、柵建設をラウンド6とラウンド10に行える。</div>\
<div id="ja-text-266" title="266. 畑好き"><p style="font-style:italic">コスト: なし</p>「種をまく そして パンを焼く」のアクションスペースを使うたび、アクションを行う前に小麦1を得る。または、小麦1を野菜1と交換できる。</div>\
<div id="ja-text-267" title="267. 養父母"><p style="font-style:italic">コスト: なし</p>「家族を増やす」アクションを行うとき、その場で食料1を支払えば、新しい家族をすぐに家の中に置け、このラウンドからアクションが実行できる。そうした場合、この新しい家族は「新生児」としては数えない。<br>*収穫の直前のラウンドで増やした家族であっても、養父母の能力を使用してすぐに家の中に置いた場合は、収穫で食料2が必要となる。<br>*乳母(K270)、愛人(K291)、Village Beauty(Z325)の能力で家族を増やしたときにも、養父母の能力は使える。<br>*Mother of Twins(Z336)で家族を2人増やしたとき、養父母の能力はそれぞれの家族に対して適用できる。支払いコストは、家族1人につき食料1。<br>*通常の「家族を増やす」アクションで必要な部屋の空きをチェックするとき、あなたは、前に「家族を増やす 部屋がなくてもよい」で増やした新生児たちもカウントしなければならない(たとえ前の新生児たちが帰宅する前に、養父母の能力を使った新生児が部屋に置かれるとしても)。 (訳注：たとえば、部屋数2、家族数3の状態、つまり1度「家族を増やす 部屋がなくてもよい」を行った状態でラウンドを開始するとします。このラウンドに部屋数を3にしたとしても、通常の「家族を増やす」アクションをを行うことはできませんよ、ということを言いたいのだと思います。理屈としては、部屋数を3にした時点で部屋がなかった家族に部屋が割り当てられる処理が先に発生するため、家族を増やすための空き部屋がなくなります。養父母の能力を使うと、新生児を直ちに家の中に置くことになるので、勘違いが起きないように分かっていることをあえて明示しているものと推測します)</div>\
<div id="ja-text-268" title="268. 出来高労働者"><p style="font-style:italic">コスト: なし</p>木材、レンガ、葦、石材、小麦をアクションスペースから得るたび、食料1で同じものを1つ買える。野菜をアクションスペースから得るたび、食料2で同じものをもう1つ買える。<br>*出来高労働者の能力は労働フェイズ(フェイズ3)でのみ使える。ラウンド開始時には使えない。<br>*アクションスペースから直接得た品物のみ、効果を適用できる。進歩や職業で得た品物については出来高労働者の能力は使えない。<br>*1回で複数の種類の品物を取った場合、それぞれの種類の品物について食料1で追加の品物を買える。追加の品物を買う際の支払いは同じタイミングで行うこと。<br>*あなたは、アクションスペースから直接得た品物をまず食料に換えてから、出来高労働者の支払いコストに充てても良い。出来高労働者は他のカードよりも先に解決するので、職業や進歩で得た品物は食料に換えて支払いコストに充てることはできない。<br>*出来高労働者の支払いコストの解決は、追加の品物を得る前に行う必要がある。出来高労働者で得た品物を食料に換えて、それを品物の購入コストに充てることはできない。<br>*木材配り(K284)の効果で木材が混じったアクションスペースを使った場合でも、出来高労働者の能力は起動する。<br>*木材を含むアクションスペースを使う場合、かご(E34)、キノコ探し(E196)、猪漁師(I253)の能力でアクションスペースに木材を残した結果、1つも木材を取らなかった場合でも、出来高労働者の能力で食料1を支払い木材を1使える。そのとき、前述のカードの効果で得た食料は出来高労働者の支払いコストに充てることはできない。 (訳注：あくまで出来高労働者の能力の解決が一番最初でなければいけない、ということでしょう。)<br>*種をまくアクションで小麦や野菜を共通のストックから取り畑に置く行為は、品物を受け取ったとはみなさない。よって、出来高労働者の能力も起動しない。</div>\
<div id="ja-text-269" title="269. 曲芸師"><p style="font-style:italic">コスト: なし</p>「小劇場」のアクションスペースで「小劇場」のアクションを行うたび、プレイヤー全員が手番を終えた後に「小麦1を取る」「畑1を耕す」「畑を耕して種をまく」のアクションスペースが空いていれば、そのアクションスペースに移動してアクションを実行できる。<br>*「小劇場」アクションを行うとき、あなたは権利マーカーを「小麦1を取る」「畑1を耕す」「畑を耕して種をまく」のアクションスペースに置き、リマインダーにするとよい。(訳注：小劇場を行った家族の上に権利マーカーを重ねておく方法もあります。権利マーカーの数が少ないのと、置く手間を考えるとこちらの方法のほうをオススメします。)<br>*旅芸人(I237)を出している他のプレイヤーが「小劇場」のアクションを行った場合、そのプレイヤーはあなたに食料1を支払う。<br>*他のプレイヤーが営農家(K289)を出している場合、曲芸師は営農家の後に動く。同じプレイヤーが曲芸師と営農家を同時に出している場合は、好きな順序で解決してよい。<br>*このカードをプレイしたラウンドについて、曲芸師を出した後に「小劇場」のアクションスペースに置かれた家族については、曲芸師の能力を適用し移動してよい。</div>\
<div id="ja-text-270" title="270. 乳母"><p style="font-style:italic">コスト: なし</p>あなたは増築するたびに、最大で増築した部屋数分だけ家族を増やしても良い。ただし新しい家族を置く部屋が空いている場合に限る。このコストは、家族1人につき食料1である。<br>*1回の増築アクションで複数の部屋を作った場合、食料2を払えばただちに家族を2人増やせる。(3部屋以上増築した場合は)食料3を払えば3人増やせる。<br>*新しい家族は、増築のアクションスペースに置いた家族の上に重ねておく。これらの家族は次のラウンドから使用できる。<br>*乳母の効果は、ゲーム中に何度も使える。<br>*小屋大工(E178)、左官屋(E191)、木の家増築(I81)、レンガの家増築(K132)、石の家増築(E55)で増築した場合でも、乳母の能力は使用できる。<br>*乳母の能力で家族を増やすのは「家族を増やす」アクションとして数える。この「家族を増やす」アクションに農場管理(I233)を適用する場合、新しい家族のための空きの部屋は必要ない。<br>*がらがら(K172)の能力は起動しない。</div>\
<div id="ja-text-271" title="271. 職業訓練士"><p style="font-style:italic">コスト: なし</p>他のプレイヤーが職業カードをプレイするたび、あなたは食料3を支払い職業カードをプレイできる。職業4枚目以降は、支払いコストは食料2でよい。<br>*自分の手番で職業をプレイする場合、職業訓練士を使い2枚目の職業をプレイすることはできない。<br>*職業訓練士で職業を出したときも、パン焼き棒の効果は起動する。<br>*1つのアクションで複数枚の職業(たとえば、書き机(E49)の効果や族長の娘(E173)など)がプレイされた場合、あなたは職業が出されるたびに職業訓練士の能力を使用できる。</div>\
<div id="ja-text-272" title="272. 梁打ち"><p style="font-style:italic">コスト: なし</p>改築のたび、あなたはレンガ1または石材1を木材1で代用しても良い。増築のたび、あなたはレンガ2または石材2を木材1で代用しても良い。<br>*1回で2部屋以上を増築する場合、それぞれの部屋に梁打ちの効果を適用してよい。<br>*あなたは、他の増築や改築のコストを変更するカードを梁打ちと同時に使用しても良い。<br>*増築のコストがレンガ1または石材1になっている場合、梁打ちの効果は使えない(たとえば、レンガ積み(I241)とレンガ貼り(I243)を同時に出している場合など)。</div>\
<div id="ja-text-273" title="273. 骨細工"><p style="font-style:italic">コスト: なし</p>食料に換えた猪1匹ごとに、あなたは自分のストックから木材を最大2つまでこのカードの上に置ける。ゲーム終了時、あなたはこのカードの上にある木材1つにつき1点のボーナス点を得る。ただし、1、4、7、10番目の木材は除く。<br>*食料に換えた猪は、革なめし工(K280)、Taxidermist(Z330)のどちらかの上に置くか、骨細工の能力に使うか、いずれかである。1匹の猪を同時に複数のカードの効果として解決することはできない。<br>*毛皮(K339)、ブラシ作り(E156)をプレイしている場合、1匹の猪で骨細工とこれらのカードの効果を同時に解決できる。<br>*このカードの上にある木材を取り除くことはできないし、他の用途で用いることもできない。このカードの上にある木材はあなたのストックとはみなさないため、家具製作所(A7)、倉庫主(K287)、製材所(K122)の効果を判定する際にはカウントしない。</div>\
<div id="ja-text-274" title="274. 有機農業者"><p style="font-style:italic">コスト: なし</p>あなたはゲーム終了時、最低1匹は家畜がいて、かつ3匹以上収容能力に空きがある牧場ごとに1点のボーナス点を得る。<br>*森の牧場(K145)に1匹以上家畜が乗っていれば、それはボーナス点に数える。<br>*家畜庭(E58)でも、条件を満たせばボーナス点を得ることがある。たとえば、同時に水飲み場(E59)をプレイしている場合。</div>\
<div id="ja-text-275" title="275. ぶらつき学生"><p style="font-style:italic">コスト: なし</p>あなたは職業カードをプレイするとき、自分で職業を選んで出す代わりに他のプレイヤーにランダムに引いてもらい、それをプレイすることができる。そうする場合、あなたはカードをプレイするコストを支払う前に食料3を受け取るが、他のプレイヤーに引いてもらった職業は必ずプレイしなければならない。<br>*引いてもらった職業カードをプレイするコストが足りない場合(たとえば、愛人(K291)や族長(E172)のようなカード)、足りない分だけ物乞いカードを取らなければならない。<br>*未プレイの職業カードが残り1枚の状態から職業をプレイするときでも、ぶらつき学生の能力は使用できる。</div>\
<div id="ja-text-276" title="276. 村長"><p style="font-style:italic">コスト: なし</p>You receive wood immediately when you play this card: if played in round 12 or 13, take 1 wood; if played in round 9, 10, or 11, take 2 wood; if played in round 6, 7, or 8, take 3 wood; if played before round 6, take 4 wood. At the end of the game, any player who has no negative points receives 5 bonus points.<br>* <p>あなたはこのカードをプレイしたらすぐに木材を得る：ラウンド12〜13にプレイしたら木材1、ラウンド9〜11なら木材2、ラウンド6〜8なら木材3、ラウンド6より前なら木材4。ゲーム終了時、マイナス点がないプレイヤーは全員5点のボーナス点を得る。</div>\
<div id="ja-text-277" title="277. 工場主"><p style="font-style:italic">コスト: なし</p>レンガか石の家に住み次第、家具製作所(A7)、製陶所(A8)、かご製作所(A9)は小さい進歩になり、好きな建築資材2つ分安くなる。</div>\
<div id="ja-text-278" title="278. 林務官"><p style="font-style:italic">コスト: なし</p>あなたは種をまくアクションを行うとき、このカードの上に木材を植えることができる。このカードの上に木材の柱を3つまで置ける。この木材は、小麦を植えるのと同じように扱い、収穫の畑フェイズで収穫する。<br>*あなたは、木材を最大3つまで自分の手元のストックからこのカードの上に隣接させて置き、それらの木材の上に追加の木材を共通のストックから取り、重ねて置く。<br>*それぞれの収穫フェイズで、あなたはこれらの木材の山からそれぞれ木材1を取る。<br>*小麦を植えるときに、職業の効果で1山につき(3つでなく)4つ置ける状態になっている場合、林務官の上に置く木材も同じように4つになる。小麦を1山につき5つ置ける場合は、木材も同じように5つになる。畑農(I219)を出している場合、林務官の上に木材を1つだけ植え、他の畑には何も植えない場合は山の高さを5にでき、林務官の上に木材を2つだけ植え、他の畑には何も植えない場合には山の高さを4にできる。<br>*小農夫(K286)では、林務官の上に追加の木材を置くことはできない。<br>*種をまくアクションスペースは好きに選べるが、結局は林務官の上に木材を植えることになる。（訳注：何が言いたいのかイマイチ分かりません）<br>*このカードの上の木材は倉庫主(K287)の能力発動チェックには数えない。ゲーム終了時に家具製作所(A7)または製材所のボーナス計算をするときは、林務官のカードの上にある木材も含めてよい。<br>*ゲーム終了時に、木材は小麦としてカウントしない。</div>\
<div id="ja-text-279" title="279. 学者"><p style="font-style:italic">コスト: なし</p>あなたは石の家に住み次第、毎ラウンドの開始時に食料1を支払い職業カードをプレイするか、コストを払って進歩カードを出せる。<br>*学者の効果で職業を出すときに本棚(K112)、ぶらつき学生(K275)、パトロン(E192)の能力が起動する。<br>*それぞれのラウンドで、学者の効果を使い最大1枚のカードをプレイすることができる。<br>*学者の能力で大きい進歩をプレイしてもよい。<br>*学者の能力で進歩をプレイしたとき、販売人(E179)の能力が起動する。<br>*ラウンドの開始時に受け取る食料を、学者で職業カードを出すための支払いコストに使える。また、ラウンドの開始時に受け取る食料や資材を、進歩カードのコスト支払いに充ててもよい。<br>*学者の効果で出した職業や進歩がラウンドの開始時に発動する効果を持っていた場合、あなたはカードをプレイしたラウンドの開始時からただちにその効果を適用することを選べる。</div>\
<div id="ja-text-280" title="280. 革なめし工"><p style="font-style:italic">コスト: なし</p>あなたは猪か牛を食料に換えた場合、それらのコマをこのカードの上に置く。ゲーム終了時に、このカードの上にある家畜マーカーの数でボーナス点を得る。猪6匹以上で3点、4〜5匹で2点、2〜3匹で1点。牛4匹以上で3点、3匹で2点、2匹で1点。<br>*食料に換えた猪を革なめし工の上に置く場合は、骨細工(K273)、Taxidermist(Z330)、ブラシ作り(E156)の能力には使えない。<br>*毛皮(K339)を出している場合、毛皮の能力を起動しつつ革なめし工の上に猪マーカーを置ける。<br>*このカードの上にある家畜はゲーム終了時の得点計算には数えない。</div>\
<div id="ja-text-281" title="281. 行商人"><p style="font-style:italic">コスト: なし</p>あなたは、アクションスペースで「小さい進歩」のアクションを選んだ場合、小さい進歩の代わりに大きい進歩を行うことができる。あなたがアクションスペースで「大きいまたは小さい進歩」のアクションを選んだ場合、小さい進歩を2回行える。<br>*オプション：行商人の能力は1ターンに1回しか使えない。<br>*行商人と販売人(E179)を両方とも場に出している場合、あなたは「大きいまたは小さい進歩」のアクションスペースで、食料1を支払い最大4回の小さい進歩が行える。または、「小さい進歩」のアクションスペースで食料1を支払い2回の大きい進歩が行える。<br>*行商人と商人(I228)を両方とも場に出している場合、あなたは「スタートプレイヤー」のアクションスペースを使うときに小さい進歩を3回続けて行える。<br>*学者(K279)の能力で小さい進歩を出した時は、行商人の能力は起動しない。(訳注：アクションスペースを使っていないからだと思います。)</div>\
<div id="ja-text-282" title="282. 執事"><p style="font-style:italic">コスト: なし</p>あなたはこのカードをプレイしたらすぐに木材を得る：ラウンド12〜13にプレイしたら木材1、ラウンド9〜11なら木材2、ラウンド6〜8なら木材3、ラウンド6より前なら木材4。ゲーム終了時に家の部屋数が一番多い人は全員3点のボーナスを得る。</div>\
<div id="ja-text-283" title="283. 木材運び"><p style="font-style:italic">コスト: なし</p>ラウンド8から14のうちまだ始まっていないラウンドにそれぞれ木材1を置く。これらのラウンドの開始時に、その木材を得る。<br>*このカードを出したラウンド、およびこれより前のラウンドの木材は得られない。</div>\
<div id="ja-text-284" title="284. 木材配り"><p style="font-style:italic">コスト: なし</p>各ラウンドの労働フェイズの開始時に、あなたは「木材3」のアクションスペースにある木材を、その下の「レンガ1」「葦1」「漁」のスペースに均等に分けて置くことができる。このカードをプレイしたらすぐに、あなたは木材2を得る。<br>*猪猟師(I253)やキノコ探し(E196)のような職業がいる、もしくはソリティアゲームのとき、木材が均等に分けられないケースがあるかもしれない。その場合は、アクションスペースに端数の木材1または2個を残す。<br>*木材配り、職場長(K308)、毒見役(I260)はお互いの能力の起動に反応して能力を使用しても良い。職業の能力を使うことを決めたプレイヤーは、その決定を覆せない。職業の能力を使わずに保留しているプレイヤーは、労働フェイズ(フェイズ3)の開始時までなら考え直せる。<br>*木材配りの能力を使用後に「木材3」のアクションスペースに木材がない場合、プレイヤーはこのラウンド中にそのアクションスペースを使ってもよいが、アクションスペースからは何も得られない。</div>\
<div id="ja-text-285" title="285. ブリキ職人"><p style="font-style:italic">コスト: なし</p>あなたはいつでも、レンガ1を食料1に換えられる。誰かが井戸(A10)を作った後は、あなたはレンガ2を食料3に換えられるようになる。<br>*この井戸によるボーナスは、井戸が村の井戸(I66)に改良されても効果が持続する。</div>\
<div id="ja-text-286" title="286. 小農夫"><p style="font-style:italic">コスト: なし</p>あなたの牧場は通常は家畜2匹までのところを3匹まで飼える。あなたの持っている畑が2つ以下のときは、種をまいた畑それぞれに追加の小麦1または野菜1をストックから取り、置く。<br>*あなたが水飲み場(E59)や角笛(E29)を出している場合、これらのカードの効果は小農夫に上乗せされる。もし3枚のカードをすべて場に出したならば、通常は家畜が2匹までの牧場に、7匹の羊を飼える。<br>*角笛を出している場合でも、小農夫の能力は柵で囲われていない厩には効果がない。<br>*平地(K105)、マメ畑(E18)、レタス畑(E47)、カブ畑(K37)は、小農夫の「畑が2つ以下」の判定のときにカウントし、(条件を満たせば)小農夫の能力でこれらの畑の上に追加の小麦や野菜を置く。平地については、畑2つ分として数える。<br>*雑木林(I78)や林務官(K278)は、小農夫の「畑が2つ以下」の判定のときにはカウントせず、小農夫の能力で木材を追加で置くこともできない。<br>*家畜庭(E58)の収容能力は増えない。<br>*小麦畑の上に追加の小麦を、野菜畑の上に追加の野菜を置く。<br>*小農夫の能力はオプションであるが、もし能力を使うのであれば、あなたは種をまくアクションで種をまいたすべての畑について効果を適用しなければならない。(訳注：2つまいた畑の片方だけに小農夫の効果を適用するなどのように、選択的に小農夫の能力を使うようなことはできない、という意味だと思います)</div>\
<div id="ja-text-287" title="287. 倉庫主"><p style="font-style:italic">コスト: なし</p>ラウンドの開始時に、石材を5つ以上持っていれば石材1を、葦を6つ以上持っていれば葦1を、レンガを7つ以上持っていればレンガ1を、木材を8つ以上持っていれば木材1を得る。<br>*資材は、あなたのストックにある物だけをカウントする。雑木林(I78)や資材商人(K310)の上にある資材はカウントしない。<br>*小さい進歩や職業の効果でラウンドの開始時に資材を受け取れる場合、倉庫主の効果を適用する前にこれらの資材を手に入れてよい。</div>\
<div id="ja-text-288" title="288. 倉庫番"><p style="font-style:italic">コスト: なし</p>葦と石材を同時に取るアクションスペースを使うたび、レンガ1か小麦1を追加で得る。<br>*倉庫番の能力が起動するのは、5人ゲームの「葦1、石材1、木材1」のアクションスペースと4人ゲームの「葦1、石材1、食糧1」のアクションスペースだけである。<br>*小さい進歩や職業の効果で葦と石材を同時に取った場合は、倉庫番の能力は起動しない。</div>\
<div id="ja-text-289" title="289. 営農家"><p style="font-style:italic">コスト: なし</p>全プレイヤーが人々を配置し終えた後、「種をまく」のアクションスペースが空いていれば、「小麦1を取る」または「野菜1を取る」のアクションスペースにいるあなたの人々を移動してもよい。<br>*「小麦1を取る」または「野菜1を取る」のアクションスペースを選んだとき、空いている「種をまく」のスペースに権利マーカーを置き、あなたに権利があることを示す。<br>*「種をまく」のアクションスペースは２つある。2つめのアクションスペースは、ステージ5(ラウンド12, 13)で登場する。<br>*2つの「種をまく」アクションスペースは、あわせて行える選択式のアクションもある。あなたは、家族を「種をまく」のアクションスペースに移動させた後に、種をまくアクションを行わずにもう一方のアクションだけを実行してもよい。<br>*同じラウンドに「小麦1を取る」「野菜1を取る」のアクションスペースをあなたが両方使った場合、営農家の能力で動かせる家族は2人のうち1人だけである。<br>*他のプレイヤーが曲芸師(K269)を出していた場合、営農家を出しているプレイヤーが先に能力を使うかどうかを決める。同じプレイヤーが曲芸師と営農家を出していた場合、どの順序で能力を使うかはそのプレイヤーが決めてよい。<br>*畑守を出している場合、「畑を耕して種をまく」のスペースが使われていても、営農家の能力でそのスペースに移動してアクションを実行できる。<br>*営農家を場に出す前にすでに家族を「小麦1を取る」「野菜1を取る」のアクションスペースに置いていた場合でも、あなたはこれらの家族をラウンド終了時に動かしてよい。</div>\
<div id="ja-text-290" title="290. レンガ職人"><p style="font-style:italic">コスト: なし</p>木材かレンガを取るアクションスペースを使うたびに、あなたはさらにレンガ1を得る。<br>*木材かレンガが置かれているアクションスペースを使うと、能力が起動する。アクションスペースに木材もレンガもない場合(例:木材配り(K284))は、そのアクションスペースは使えない。<br>*かご(E34)、キノコ探し(E196)、猪猟師(I253)ですべての木材をアクションスペースに残した場合でも、レンガ職人の能力は起動する。<br>*木材配りによって木材が置かれたアクションスペース（訳注：葦や漁のスペース）を使うと、レンガ職人の能力が起動する。<br>*5人ゲームの「葦1、石材1、木1」や、3人ゲームの「資材1を取る」で木材を取った場合でも能力は起動する。<br>*小さい進歩や職業の効果で木材を受け取った場合には、レンガ職人の能力は起動しない。<br>*アクション1回につき、レンガ職人でもらえるレンガは最大1である。</div>\
<div id="ja-text-291" title="291. 愛人"><p style="font-style:italic">コスト: 4x<img align="absmiddle" src="img/pionPN16.png"></p>このカードをプレイしたらすぐに、「家族を増やす 部屋がなくてもよい」のアクションを行う。このカードを出すのに追加で食糧4が必要。<br>*愛人で家族を増やした後に部屋を増築した場合、増やした家族は新しい部屋に置く。ベターなのは増築して通常の「家族を増やす」を行ってから、愛人で家族を増やす方法である。<br>*がらがら(K127)の能力は起動しない。</div>\
<div id="ja-text-292" title="292. 露天商の女"><p style="font-style:italic">コスト: なし</p>アクションスペースまたは、小さい進歩の効果であなたが野菜を得るたび、あなたは追加で小麦2を得る。<br>*あなたが職業を使って野菜を得た場合、露天商の女の能力は起動しない。<br>*露店(E39)または週末市場(I104)をプレイすると、露天商の女の能力が起動する。ただし、あなたはまず小さい進歩のカードを出すためのコストを先に支払うこと。<br>*温室(K117)によってラウンドの開始時に野菜を得る場合も、露天商の女の能力が起動する。<br>*種をまくときに共通のストックから野菜を取って畑に置く行為は「野菜を得る」とはみなさない。このときは露天商の女の能力は起動しない。</div>\
<div id="ja-text-293" title="293. 鋤手"><p style="font-style:italic">コスト: なし</p>現在のラウンドに4, 7, 10を加え、そのラウンドのスペースに畑タイルを1つずつ置く。これらのラウンドの開始時に、あなたは食糧1を支払いその畑を耕せる。<br>*畑を耕さない場合、畑タイルは共通のストックに戻る。<br>*ソリティアゲームで最初から鋤手が場に出ている場合、現在のラウンドは0として扱う。つまり、ラウンド4, 7, 10に畑タイルをそれぞれ置く。<br>*ラウンドの開始時に食糧を受け取った場合、その食糧を畑タイルのための支払いに充てて良い。たとえば、井戸(A10)によって得る食糧を畑のための支払いに充てるなど。</div>\
<div id="ja-text-294" title="294. 柴結び"><p style="font-style:italic">コスト: なし</p>各部屋の増築やすべての改築について、必要な葦を合計木1で代用してもよい。(柴で屋根を作るということ)<br>*複数の部屋を増築する場合、それぞれの部屋について柴結びの効果を適用して良い。<br>*柴結びと同時に、他の増築や改築のコストを変更するカードを使用しても良い。</div>\
<div id="ja-text-295" title="295. 牛飼い"><p style="font-style:italic">コスト: なし</p>あなたの牛はラウンド12の最後に繁殖する。ただし繁殖するスペースが必要。このカードをプレイしたらすぐに牛1を得る。</div>\
<div id="ja-text-296" title="296. 種屋"><p style="font-style:italic">コスト: なし</p>あなたは「小麦1を取る」のアクションスペースを使うたび、追加で小麦1を得る。このカードをプレイしたらすぐに、小麦1を得る。</div>\
<div id="ja-text-297" title="297. 羊番"><p style="font-style:italic">コスト: なし</p>あなたはアクションスペースから羊を取るたびに、追加の羊を共通のストックから受け取る。あなたは、(繁殖フェイズを除き)いつでも羊3を牛1と猪1に換えられる。<br>*ラウンド1-4の「羊1」および、5人ゲームの「羊1、猪1、または牛1」のアクションスペースを使うと、羊農の能力が起動する。<br>*進歩や職業の効果で羊を受け取った場合は、羊農の能力は起動しない。<br>*手に入れた家畜は、ただちに進歩で食料に換えても良い。農場内に家畜を置くスペースがなくても良い。<br>*手に入れた家畜は、ただちに羊農の能力で交換しても良い。このとき、農場内に家畜を置くスペースがなくても良い。<br>*最後の繁殖フェイズが終わると、ただちにゲーム終了となる。ラウンド14終了時の最後の繁殖フェイズで、(訳注：羊農の能力を使い)羊を他の家畜に交換することはできない。</div>\
<div id="ja-text-298" title="298. 羊農"><p style="font-style:italic">コスト: なし</p>石の家に住み次第、それ以降のラウンドのスペースに羊1を置く。これらのラウンドの開始時に、その羊を得る。<br>*すでに石の家に住んでいる場合は、ただちに(訳注：次以降のラウンドのスペースに)羊を置く。<br>*カードを出したラウンドには、無料の羊は得られない。<br>*無料の羊は、手に入れたらただちに進歩で食糧に換えても良い。</div>\
<div id="ja-text-299" title="299. 畜殺人"><p style="font-style:italic">コスト: なし</p>他のプレイヤーが家畜を1匹以上食料に換えるたびに、あなたは共通のストックから食糧1を受け取る。食糧供給フェーズで、あなたは最後に食糧供給する。(つまり、他のプレイヤーの畜殺によって得た食糧を食糧供給に使える。)<br>*あなた自身が家畜を食料に換えた場合、追加の食糧は得られない。<br>*畜殺人と畜殺場(I97)が同時に場に出ている場合、それらのカードの所有者は、このラウンドのプレイ順序に従って食糧供給する。</div>\
<div id="ja-text-300" title="300. 火酒作り"><p style="font-style:italic">コスト: なし</p>収穫の食糧供給フェイズで、あなたは野菜最大1を食糧5に換えられる。<br>*野菜を食料に換えるのに、かまど(A1/A2)、調理場(A3/A4)、暖炉は不要である。<br>*火酒を作る行為は「パンを焼く」ではない。<br>*畑に植えてある野菜を食料に換えることはできない。手元のストックにある野菜を使うこと。</div>\
<div id="ja-text-301" title="301. 彫刻家"><p style="font-style:italic">コスト: なし</p>各ラウンドに1回、あなたは進歩、木の家の増築、厩の建築、柵の建築のいずれかで支払う木材を1つ減らせる。<br>*各ラウンドにつき1回しか効果を使えない。このカードの上にあなたの木材コマを1つ置いて、まだ能力が使えることを示しても良い。<br>*1回のアクションで複数件の増築をする場合でも、彫刻家の能力は全体で1度しか使えない。<br>*他の増築や改築のコストを変更するカードと彫刻家を組み合わせて使用してもよい。<br>*レンガの柱(E37)、柴屋根(K136)、梁打ち(K272)、柴結び(K294)を出していたとしても、レンガの家や石の家を増築するときには彫刻家の能力は使えない。</div>\
<div id="ja-text-302" title="302. 猪使い"><p style="font-style:italic">コスト: なし</p>現在のラウンドに4, 7, 10を足し、それらのラウンドのスペースにそれぞれ猪1を置く。これらのラウンドの開始時に、その猪を得る。<br>*ソリティアゲームで最初からこの職業がプレイされている場合、現在のラウンドを0として計算する。このとき、猪は4, 7, 10ラウンドのスペースにそれぞれ置かれる。<br>*手に入れた猪は、進歩で即座に食糧に換えても良い。このとき、農場内に置くスペースがなくても良い。</div>\
<div id="ja-text-303" title="303. 石打ち"><p style="font-style:italic">コスト: なし</p>あなたはいつでも、「改築」のアクションスペースを使わずにレンガの家を石の家に改築することができる。<br>*改築に必要なコストは支払うこと。<br>*修理屋(E200)と石打ちを組み合わせて、アクションスペースを使わずに木の家から石の家に改築することはできない。</div>\
<div id="ja-text-304" title="304. 獣医"><p style="font-style:italic">コスト: なし</p>このカードをプレイしたら、羊コマ4つ、猪コマ3つ、牛コマ2つを袋に入れる。各ラウンドの最初に、袋から2つ引き、同じコマを引けば、その家畜を手に入れる。残ったコマは袋に戻す。(訳注：家畜はコマの形に特徴があるため手触りで判別できてしまいます。木材チップなどの資材コマで代用するほうがよいでしょう。)<br>*異なる2つの家畜を引いた場合は、両方とも袋に戻す。<br>*同じ家畜を引いた場合、手に入れた家畜を進歩で即座に食糧に換えても良い。</div>\
<div id="ja-text-305" title="305. 家畜主"><p style="font-style:italic">コスト: なし</p>ラウンド7のスペースに羊1を、ラウンド10のスペースに猪1を、ラウンド14のスペースに牛1を置く。これらのラウンドの開始時に、食糧1を払えば対応する家畜が入手できる。<br>*食糧1を支払った後、手に入れた家畜を進歩で即座に食料に換えても良い。ただし、この食糧は家畜の購入費用に充当してはならない。家畜の購入費用は先払いである。<br>*(訳注：たとえば井戸などの効果で)ラウンドの開始時に食糧を受け取る場合、その食糧を家畜を購入するコストに充てることができる。<br>*すでに過ぎているラウンド(カードを出したラウンドも含む)については、家畜は得られない。</div>\
<div id="ja-text-306" title="306. 調教師"><p style="font-style:italic">コスト: なし</p>あなたの家の部屋1つにつき家畜を1匹飼える。また、家の中に2種類以上の家畜がいてもよい。<br>*ヤギ(K210)を出していると、調教師はまったく効果がない。<br>*調教師の能力で飼える家畜は、ペットの分のスペースを置き換えたものとなる。(つまり、3部屋ある場合は家畜を3匹まで飼える。4匹ではない。)</div>\
<div id="ja-text-307" title="307. 家畜飼い"><p style="font-style:italic">コスト: なし</p>未使用のスペースを柵で囲って新たな牧場を1つ以上作るたび、家畜のペアを1組購入できる。食糧1で羊2匹、食糧2で猪2匹、食糧3で牛2匹。<br>*最低1スペースは未使用スペースを使うこと(厩のあるスペースは未使用スペースではないことに注意)。たとえば、未使用スペース1つと柵で囲われていない厩のスペース1つを柵で囲って2スペース分の牧場を新たに作った場合は、家畜飼いの能力を使用できる。<br>*柵見張り(K312)の能力を使ったときでも、家畜飼いの能力が起動する。<br>*牧場を同時に2つ以上作った場合や、柵管理人(E175)などで同じ手番に2回以上新たな牧場を作った場合であっても、家畜のペアを購入できるのは1手番に1回だけである。<br>*食糧を支払った後、手に入れた家畜を進歩で即座に食料に換えても良い。ただし、この食糧は家畜の購入費用に充当してはならない。家畜の購入費用は先払いである。</div>\
<div id="ja-text-308" title="308. 職場長"><p style="font-style:italic">コスト: なし</p>各ラウンドの労働フェイズの開始時に、食糧1を共通のストックから取り、あなたの選んだアクションスペースに置くことができる。<br>*木材配り(K284)、職場長、毒見役(I260)はお互いの能力の起動に反応して能力を使用しても良い。職業の能力を使うことを決めたプレイヤーは、その決定を覆せない。職業の能力を使わずに保留しているプレイヤーは、労働フェイズ(フェイズ3)の開始時までなら考え直せる。</div>\
<div id="ja-text-309" title="309. 織工"><p style="font-style:italic">コスト: なし</p>各ラウンドの労働フェイズの開始時に羊を2匹以上飼っていれば、食糧1を得る。<br>*羊番(K298)、羊使い(I250)、羊飼い親方(E204)、家畜主(K305)の効果でボード上に置かれている羊、および獣医(K304)の効果で得る羊は、労働フェイズの開始前に得る。つまり、これらの方法で得た羊は、織工の前提条件である羊2匹に数えて良い。</div>\
<div id="ja-text-310" title="310. 資材商人"><p style="font-style:italic">コスト: なし</p>このカードの上に、下から順に石材、レンガ、石材、レンガ、葦、レンガ、木材を重ねて置く。山の一番上にある資材と同じ種類の資材を得るたびに、一番上の資材も得る。<br>*資材は、ラウンドの開始時(フェイズ1)でも労働フェイズ(フェイズ3)でも(条件を満たせば)もらえる。<br>*進歩や職業によって資材を得た場合でも、資材商人の能力は起動する。しかし、カードの効果を適用した結果、資材を受け取らなかった場合(たとえば、かご(E34)、材木買い付け人(I234)等)は、受け取らなかった資材について資材商人の能力を使用することはできない。<br>*木材配り(K284)、倉庫番(K288)、レンガ職人(K290)といった職業の効果で複数の資材を得たとき、資材商人の上にある資材を(条件を満たせば)複数個取れる。<br>*同時に複数の資材を得る場合、受け取る順番はあなたが決めて良い。ただし、アクションスペースの資材をすべて受け取ってから、カードの効果で追加の資材を受け取ること。</div>\
<div id="ja-text-311" title="311. 魔術使い"><p style="font-style:italic">コスト: なし</p>最後の人を「小劇場」を含むアクションスペースに置いて「小劇場」のアクションを選ぶたび、追加で小麦1と食糧1を得る。<br>*旅芸人(I237)を場に出している他のプレイヤーが「小劇場」のアクションを行った場合、あなたに食料1を支払う。<br>*Keg(Z314)をプレイしている場合、ゲストはラウンド中の最後の人として数える。<br>*営農家(K289)または曲芸師(K269)を場に出していて、ターン終了時に人が移動する場合、それは最後に置いた人とはみなさない。(つまり、営農家や曲芸師の能力は魔術使いの判定においては無視してよい。)</div>\
<div id="ja-text-312" title="312. 柵見張り"><p style="font-style:italic">コスト: なし</p>各ラウンドに1回、あなたは厩を立てたときに食糧1を支払い、周りを1スペース分の柵で囲うことができる。このとき、柵を立てるためのコストは不要。<br>*馬手(I254)の能力で建てた厩に対しても、柵見張りの能力は起動する。<br>*厩番(E207)の能力を使用したときも、柵見張りの能力は起動する。柵を立てるとき、あなたは無料の厩を建設しなければならないが、この厩を無料の柵で囲える。この無料の柵に対して再び厩番の能力が起動することはない（2つめの無料の厩はもらえない）。最初の柵の建設(厩番と柵見張りの能力が起動する前)は、柵建設のルールに従い牧場となるように柵を置かなければならない。<br>*柵見張りの能力を使用することで、柵管理人(E175)、農場主(E160)、家畜飼い(K307)の能力が起動する。<br>*柵見張りの能力を使用することで、厩番の能力が起動する。まず通常通り厩を建て、それを(柵見張りの能力で)柵で囲う。その後、(厩番の能力で)新たな厩を無料で置く。2つめの厩を置くときには、柵見張りの能力は起動しない。<br>*柵建設のルールに従うこと。すでに牧場がある場合、新たに置く厩を柵見張りの能力で囲うならば、既存の牧場に隣接している必要がある。</div>\
<div id="ja-text-313" title="313. title313"><p style="font-style:italic">コスト: なし</p>Once you live in a clay hut or stone house, wheneveryou use a person’s action to take wood you canpay 1 food to also plow 1 field.<br>* This is a plough.<br>* Is activated when you use an action space onwhich wood is placed each round. You cannotuse such an action space just to use this card ifthe action space contains no wood (e.g. becauseof the Wood Distributor K284).<br>* Is activated even if you leave all the wood on theaction space because of Basket E34, MushroomCollector E196, or Pig Catcher I253.<br>* Is activated when you use an action space thatcontains wood because of the Wood Distributor.<br>* Is also activated by the action space “1 Reed,Stone, and Wood” in 5-player games, and the actionspace “Take 1 Building Resource” in 3-playergames if you take wood.<br>* Is not activated when you receive wood becauseof a minor improvement or occupation.</div>\
<div id="ja-text-314" title="314. title314"><p style="font-style:italic">コスト: なし</p>Once all the people have been placed in this round,you may place a guest marker to carry out an additionalaction. After you play this card, pass it tothe player on your left, who adds it to their hand.<br>* The guest is played after all family members,other guests, and the occupant of the Reed HutK138, but before moving a person (e.g. becauseof the Countryman K289 or Acrobat K269).<br>* The action performed by a guest counts for theChurch Warden I227.<br>* The guest does not need to be fed during harvesttime.<br>* This card is passed to the left immediately whenit has been played. The next player may use theKeg the same round.<br>* In a solo game, this card is removed from thegame after you play it.</div>\
<div id="ja-text-315" title="315. title315"><p style="font-style:italic">コスト: なし</p>During the feeding phase of each harvest, you canuse the Brewer’s Copper to convert at most 1 grainto 2 food. At the end of the game, you receive 1bonus point if you have at least 7 grain.<br>* Using the Brewer’s Copper does not count asbaking.</div>\
<div id="ja-text-316" title="316. title316"><p style="font-style:italic">コスト: なし</p>This card cannot be played once all other playershave 2 or more occupations (3 occupations in a 3-player game, 4 occupations in a 2-player game).<br>* In a 1-player game, you can always play thiscard.</div>\
<div id="ja-text-317" title="317. title317"><p style="font-style:italic">コスト: なし</p>Pay 2 food for each of your family members, andreceive a total of 4 bonus points. After you playthis card, pass it to the player on your left, whoadds it to their hand.<br>* Write the bonus points on the scoring pad.<br>* You do not have to pay for guests or the occupantof the Reed Hut K138.<br>* In a solo game, this card is removed from thegame after you play it.</div>\
<div id="ja-text-318" title="318. title318"><p style="font-style:italic">コスト: なし</p>When you play this card, you can convert as manyanimals to food as you have family members. Foreach sheep, you receive 3 food; for each wild boar,4; and for each cattle, 5. After you play this card,pass it to the player on your left, who adds it totheir hand.<br>* You do not need a cooking improvement to convertthe animals to food.<br>* Is not a cooking improvement.<br>* Guests or the occupant of the Reed Hut K138do not count as family members.<br>* You may choose to convert fewer animals to foodthan you have family members.<br>* In a solo game, this card is removed from thegame after you play it.</div>\
<div id="ja-text-319" title="319. title319"><p style="font-style:italic">コスト: なし</p>Three times during the game (but at most onceper round), you can place 1 vegetable from yourpersonal supply on this card and receive 3 food inexchange. The vegetables on this card are countedin the scoring at the end of the game.<br>* You do not need a cooking improvement to exchangethe vegetable for food.<br>* A harvest counts as part of the preceding round.<br>* Placing a vegetable on this card does not countas sowing.<br>* The vegetables on this card are not consideredto be in your personal supply.<br>* The Bean Field E18, Lettuce Patch E47, andTurnip Field K137 count as prerequisites for thePumpkin Seed Oil, if there are vegetable markerson those cards.<br>* The Grocer E184 do not count as prerequisites.<br>* Placing a vegetable on this card does not activatethe Spices E25.</div>\
<div id="ja-text-320" title="320. title320"><p style="font-style:italic">コスト: なし</p>Play this card before the end of round 4. Whenyou play this card, place one of your unbuilt fencesupright on an unused farmyard space. If you havenot knocked it over by the end of the game, it isworth 2 bonus points.<br>* The farmyard space counts as used, even if thefence is knocked over, in which case, it remainson the farmyard space. You cannot reclaim it foruse as a fence.<br>* The farmyard space cannot be used for anythingelse until the end of the game. In the scoring atthe end of the game, the farmyard space countsas used, even if the fence has been knocked over.<br>* If another player knocks the fence over, you canre-place it.<br>* Placing the Maypole does not count as buildingfences.<br>* You cannot play this card after round 4, or afteryou’ve built all of your fences.</div>\
<div id="ja-text-321" title="321. title321"><p style="font-style:italic">コスト: なし</p>For each round that has not yet begun when youplay this card, you receive 1 bonus point and 2 food.<br>* Write down the bonus point(s) on the scoring padimmediately.</div>\
<div id="ja-text-322" title="322. title322"><p style="font-style:italic">コスト: なし</p>As long as you have at least 1 cattle in your farm,you can knock down your fences and rebuild themat any time, for no cost.<br>* Your animals do not run away.<br>* Fences must always be placed according to therules.<br>* Rebuilding fences does not activate the AnimalBreeder K307, Hedge Keeper E175, FarmerE160, Stablehand E207, and Shepherd’s CrookI77, or another player’s Fencer I264.<br>* When you rebuild the fences, you must use thesame number of fences. You may not removefences from your farm.</div>\
<div id="ja-text-323" title="323. title323"><p style="font-style:italic">コスト: なし</p>Place 1 vegetable from your own supply on thiscard. At any time, you can harvest this vegetableand convert it to food. If it is still on the card atthe end of the game, you receive 2 bonus points.<br>* You can count the vegetable in scoring at the endof the game.<br>* You have to place the vegetable immediatelywhen you play the Giant Pumpkin; you cannotplay this card if you do not have a vegetable.<br>* You may not place another vegetable on this cardafter you have harvested the first.<br>* When you harvest the vegetable, you have toconvert it to food immediately. You may not addit to your supply or sow it.<br>* The Giant Pumpkin does not count as a field,and is not harvested during the field phase of aharvest. You cannot use the Gardener I226 forthe Giant Pumpkin.</div>\
<div id="ja-text-324" title="324. title324"><p style="font-style:italic">コスト: なし</p>Whenever you sow, you can pay 1 wood and sow 2grain instead of 1 on an empty field.<br>* You can use this card once for every sowingaction.<br>* You may not sow an extra stack of grain on afield that is not empty.<br>* If you also have the Planter Box I90, LiquidManure K118, Fieldsman I219, or SmallholderK286, you may add extra grain to both stackswhen you sow. The field for which you use theScarecrow counts as 2 fields for the Fieldsmanand Smallholder.<br>* In each harvest, you take one grain from each ofthe stacks.<br>* The Bean Field E18, Lettuce Patch E47, andTurnip Field K137 count as prerequisites for theScarecrow, if there are no vegetables on them.The Acreage K105 counts as two empty fields ifthere are no markers on it, and as one empty fieldif there is one field planted on it.<br>* The Copse I78, Forester K278 do not count asprerequisites.<br>* You cannot use the Scarecrow to sow extra grainon the Acreage, or extra goods on the Copse,Forester, or Vineyard.<br>* Fields that have two stacks of grain on themcount as two fields for prerequisites. They countas 1 field during the final scoring.<br>* When both stacks of grain have been completelyharvested, you can only sow 1 grain on the fieldwith your next sowing action, unless you use theScarecrow again for that field.</div>\
<div id="ja-text-325" title="325. title325"><p style="font-style:italic">コスト: なし</p>At any time, you can pay 3 food to take a familygrowth action without placing one of your people.You must have room in your home. You can use thenewborn to take actions from the following round.<br>* Activates the Farm Steward I233, and Adoptive Parents K267 whenused.<br>* Does not activate the Clapper K127.<br>* If you use the Village Beauty during the harvestafter feeding your family, the new family memberremains a newborn for the entire followinground.</div>\
<div id="ja-text-326" title="326. title326"><p style="font-style:italic">コスト: なし</p>Whenever you manage to be the very last playerto place a person in any round, you receive 1 foodafter you take the final action. If you play this occupationwith the last person to be placed duringthe current round, you receive 2 food.<br>* If a player moves a person at the end of a round,e.g. because of the Countryman K289 or AcrobatK269, that does not count as the last personplaced.</div>\
<div id="ja-text-327" title="327. title327"><p style="font-style:italic">コスト: なし</p>At any time, you may look at all the remaining unplacedround cards and re-sort them. When youplay this card, you receive 2 wood.<br>* When re-sorting, the round cards must remain inthe appropriate game stage.</div>\
<div id="ja-text-328" title="328. title328"><p style="font-style:italic">コスト: なし</p>Whenever you or another player receives 3 food ormore on an action space, you receive 1 food fromthe general supply.<br>* The amount of food is counted without takingany improvements or occupations into account.The Cooper can only be activated by an actionspace that has at least 3 food on it: only the actionspace “Fishing”, an action space with “Travelingplayers”, or an action on which the ForemanK308 has placed enough food.<br>* Is not activated by using the Net FishermanI248.</div>\
<div id="ja-text-329" title="329. title329"><p style="font-style:italic">コスト: なし</p>From now until the end of the game, the other playersonly receive goods from action spaces when theyreturn their people to their home.<br>* This card applies to goods that are on actionspaces as well as goods that are taken from thesupply, but not to goods that are received fromcards.<br>* “Goods” includes wood, clay, reed, stone, vegetables,grain, and animals.</div>\
<div id="ja-text-330" title="330. title330"><p style="font-style:italic">コスト: なし</p>When you convert animals to food, you can placesome or all of them on this card instead of returningthem to the general supply. The card can holda maximum of 1 sheep, 1 wild boar and 1 cattle.These animals are counted in scoring.<br>* If you place a converted animal on the Taxidermist,you may not use the Basin Maker K273,Tanner K280, or Brush Maker E156 for thesame animal.<br>* If you also have the Pelts K339, you may usethat card as well as the Taxidermist for each convertedanimal.<br>* Animals on this card count for the Loom K146,Milking Stool K133, Estate Manager E170 andMilking Hand I246.</div>\
<div id="ja-text-331" title="331. title331"><p style="font-style:italic">コスト: なし</p>You may immediately sow each vegetable that youreceive outside the harvest phase and would otherwiseplace in your supply.<br>* Is also activated when you receive vegetablesfrom occupations and improvements, e.g. WeeklyMarket I104, Undergardener E166.<br>* Activates the Fieldsman I219 when used. If youget several vegetable at once, and you want tosow more than 1, you have to sow them at thesame time.<br>* Activates the Smallholder K286, Liquid ManureK118, Planter Box I90, Potato Dibber E32, andanother player’s Field Worker I224 when used tosow the vegetable.</div>\
<div id="ja-text-332" title="332. title332"><p style="font-style:italic">コスト: なし</p>Place 2 grain and 2 vegetables on this card. Youmay buy them at any time. Each grain costs 2 food,each vegetable costs 3 food.<br>* Pay the food before receiving the grain orvegetable.</div>\
<div id="ja-text-333" title="333. title333"><p style="font-style:italic">コスト: なし</p>You can exchange 1 wood, 1 clay, 1 reed and 1stone for 2 food and 1 bonus point at any time andas often as you like.<br>* Write down the bonus points on the scoring padimmediately.<br>* You cannot use the Wood Carver K301, StonecutterE211, or Bricklayer I243 to reduce thecosts.</div>\
<div id="ja-text-334" title="334. title334"><p style="font-style:italic">コスト: なし</p>You receive 4 food before you pay the costs of playingthis occupation. You may immediately returnthis card to your hand after you have played it.<br>* When you play this card, you have to decide immediatelyif you want to take it back. If you leaveit on the table, you may not change your mindlater.<br>* If you return this card to your hand, it does notcount as a played occupation, e.g. for minor improvements,when scoring the Reeve E217 or TutorE174, or when determining the costs of playinga subsequent occupation.<br>* If you return this card to your hand, you mayplay it again later. If you also have the WritingDesk E49, you may play the Dance Instructortwo times in the same action.</div>\
<div id="ja-text-335" title="335. title335"><p style="font-style:italic">コスト: なし</p>During the field phase of each harvest, you can exchange1 wood and 1 food for 1 bonus point.<br>* Write down the bonus points on the scoring padimmediately.<br>* You can only use this card once per harvest.</div>\
<div id="ja-text-336" title="336. title336"><p style="font-style:italic">コスト: なし</p>When you have family growth, you can pay 3 foodto bring 2 new family members instead of 1 into thegame. You do not need to have space in your homefor the second new family member.<br>* Using the Wet Nurse K270, Lover K291 activates the Mother of Twins.<br>* Receiving 2 family members with one familygrowth action activates the Clapper K127, MidwifeI232 only once, but Adoptive ParentsK267 twice.</div>\
<div id="ja-text-337" title="337. レンガ置き場"><p style="font-style:italic">コスト: なし<br>条件: 3x職業</p>このカードは全員が使えるアクションスペースになる。他のプレイヤーがここを使うとあなたに食料1を払ってストックからレンガ5を得る。あなたが使うとレンガ5か2点を得る。<br>*レンガ置き場をあなた自身が使う場合、食料1を払う必要はない。</div>\
<div id="ja-text-338" title="338. 強力餌"><p style="font-style:italic">コスト: なし</p>それぞれの収穫の食糧供給フェイズで、野菜1を支払い動物1を入手できる。ただし、この動物はすでにあなたの農場にいる動物でなければならない。<br>*この能力は、収穫1度につき1回しか起動できない。</div>\
<div id="ja-text-339" title="339. 毛皮"><p style="font-style:italic">コスト: なし<br>条件: 3x職業</p>あなたが動物1匹を食料に換えるたびに、あなたのストックから食料1を取り、あなたの部屋の上に置いても良い。各部屋には、食料1ずつしか置けない。こうして部屋の上に置いた食料は食料として使用できなくなるが、ゲーム終了時に食料1つにつきボーナス1点を得る。<br>*動物を食料に換えて得た食料を毛皮の能力に使用しても良い。<br>*革なめし工、骨細工、Taxidermist、ブラシ作りをプレイしている場合、これらのカードと毛皮の効果を同時に適用しても良い。</div>\
<div id="ja-text-340" title="340. 農夫"><p style="font-style:italic">コスト: なし</p>各ラウンドの開始時に、あなたが他のプレイヤー全員よりも多く農場を使用している場合、食料1を得る。<br>*あなたと同数のプレイヤーがいた場合、何も得られない。<br>*使用スペースのカウントは、鋤手(K293)および柵運び(I265)の能力を使用する前に行う。</div>\
<div id="ja-text-341" title="341. ギルド長"><p style="font-style:italic">コスト: なし</p>家具製作所(A7)か家具職人(I258)を出すと木材4を得る。製陶所(A8)か陶工(E214)を出すとレンガ4を得る。かご製作所(A9)かご編み(E183)を出すと葦3を得る。ギルド長を出した時点でこれらのカードがすでに場に出ている場合は、すでに出されているカードごとに対応する資材2を得る。<br>*ギルド長をプレイする前に家具製作所を製材所(K122)にしていた場合でも、木材2を得る。<br>*資材は、カードを出した後に得る。得られる資材をカードの支払いコストに充ててはならない。</div>\
<div id="ja-text-342" title="342. 猛獣使い"><p style="font-style:italic">コスト: なし</p>「小劇場」のスペースから食料を取るたび、それを家畜の購入に充てても良い。羊は1匹につき食料2、猪は1匹につき食料2、牛は1匹につき食料3。<br>*アクションスペースに置かれている食料のみを、家畜の購入に使うことができる。たとえば、旅芸人(I237)または踊り手(E212)を場に出している場合に発生する追加の食料は家畜の購入には使えない。<br>*旅芸人(I237)を場に出している他のプレイヤーが「小劇場」のアクションを行った場合、あなたに食料1を支払う。<br>*適切な進歩を持っていれば、手に入れた家畜を即座に食料に換えても良い。このとき、農場に家畜を置くスペースがなくてもよい。ただし、この方法で得た食料を猛獣使いの能力に使用することはできない。</div>\
<div id="ja-text-999" title="999. 物乞い"><p style="font-style:italic">コスト: なし</p>In each harvest, if you can\'t feed your family, you receive a mendicity card for each missing Food.</div>\
');
    }

    function setCardTooltip($targets, cluetip_options) {
        cluetip_options = $.extend({
            multiple: true,
            cluetipClass: 'agricola',
            clickThrough: true,
            cluezIndex: 3000,
            waitImage: false,
            local: true,
            attribute: 'data-jp-text',
            titleAttribute: 'data-jp-title',
            width: 220,
            leftOffset: 220 + 120 + 5,
            cursor: 'pointer',
            showTitle: true
        }, cluetip_options || {});

        $targets.each(function () {
            var selector = '#ja-text-' + getCardNumber($(this).attr('title'))[0];
            if ($(selector).is('*')) {
                $(this).attr({ 'data-jp-text': selector, 'data-jp-title': $(selector).attr('title') })
                    .cluetip(cluetip_options);
            }
        });
    }

    function createCardDesc(cardname) {
        var cardnumber = getCardNumber(cardname)[0];
        return cardJson[cardnumber];
    }

    function createDraftCards() {
        var drafts = $("form[name=fmDraft] div.clCarteMf");
        var cardname = "";
        drafts.each(function(i) {
            $(drafts[i]).hover(function() {
                if (this.title == "") {
                    return;
                }
                $("#active").text(createCardDesc(this.title));
            });
        });
    }

    function hookShowExp() {
        new window.MutationObserver(function(mutations, observer) {
            setCardTooltip($('#dvCartesPosees td.clCarteMf'), { leftOffset: 170 });
        }).observe($('#dvCartesPosees')[0], { childList: true });
    }

    function setAlert() {
        $.get('index.php', { p : "encours" }, function(data) {
            parseIndex(data);
            if (GM_getValue(agrid, false) && !GM_getValue(alerted, false)) {
                AUDIO_LIST["bell"].play();
                alert("It's your turn!");
                GM_setValue(alerted, true);

                location.href = location.href.replace(/#$/, "");
             } else if (!GM_getValue(agrid, false)) {
                GM_setValue(alerted, false);
             }

        });

        setTimeout(setAlert, ajaxmsec);
    }

    function parseIndex(data) {
        $($(data).find(".clLigne1, .clLigne2")).each(function () {
            var $self = $(this);
            var gameid = $self.find('a:first').text();
            var myturn = $self.find('[style*="color"][style*="red"]').is('*');
            GM_setValue(gameid, myturn);
        });
    }

    function setAjaxHistory() {
        $.get('historique.php', { id : agrid }, function(data) {

            var players = getPlayers(data);
            var actions = getActions(data, players);

            if (lastTurn == 0 && actions.length >= 5) {
                lastTurn = actions.length - 5;
            }

            for (i = lastTurn; i < actions.length; i = i + 1) {
                var act = actions[i];
                addAction(act);
            }

            lastTurn = actions.length;
        });

        setTimeout(setAjaxHistory, ajaxmsec);
    }

    function addAction(act) {
        $("#history tbody").prepend("<tr><td style=\"text-align: center;\">" + act.round + "</td><td>" + act.player + "</td><td>" + act.action + "</td></tr>");
    }

    function getPlayers(data) {
        var headers = data.match(/<th .+?<\/th>/g);
        var players = [];
        for (i = 0; i < headers.length; i = i + 1) {
            if (i == 0) {
                continue;
            }
            if (headers[i].match(/div>&nbsp;(.+)<div/)) {
                players[i-1] = RegExp.$1;
            }
        }

        return players;
    }

    function getActions(data, players) {
        var actions = [];
        var rounds = [];
        var round = 0;
        var n = 0;
        var player = 0;
        var act = "";
        var rows = data.match(/<tr .+?<\/tr>/g);
        for (i = 0; i < rows.length; i = i + 1) {
            var datas = rows[i].match(/<td .+?<\/td>/g);
            for (j = 0; j < datas.length; j = j + 1) {

                if (datas.length != players.length && j == 0) {
                    round = round + 1;
                    continue;
                }

                if (datas[j].match("&nbsp;")) {
                    continue;
                }

                player = j;
                if (datas.length != players.length) {
                    player = j - 1;
                }

                if (datas[j].match(/>(\d+)<\/div>(.+)<\/td>/)) {
                    n = RegExp.$1;
                    act = RegExp.$2;

                    actions[Number(n) - 1] = new Action(round, players[player], act);
                }
            }
        }

        return actions;
    }

    function getAgricolaId() {
        return document.location.href.match(/\d+/)[0];
    }

    function getCardNumber(cardname) {
        return cardname.match(/^\d+/);
    }

    function GM_getValue(key, defaultValue)
    {
      var value = window.localStorage.getItem(key);
      if (value != null) {
        return eval(value);
      } else {
        return defaultValue || null;
      }
    }

    function GM_setValue(key, value)
    {
      window.localStorage.setItem(key , value);
    }

    function initializeCardJson() {
        var json = {
            "1" : "1 かまど 以下の品をいつでも食料にできる。野菜：2　羊：2　猪：2　牛：3　「パンを焼く」のアクションで、小麦：2",
            "2" : "2 かまど 以下の品をいつでも食料にできる。野菜：2　羊：2　猪：2　牛：3　「パンを焼く」のアクションで、小麦：2",
            "3" : "3 調理場 以下の品をいつでも食料にできる。野菜：3　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3",
            "4" : "4 調理場 以下の品をいつでも食料にできる。野菜：3　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3",
            "5" : "5 レンガ暖炉 「パンを焼く」のアクションのたびに、小麦最大1を食料5にできる。このカードの獲得のとき、追加アクションで「パンを焼く」ができる。",
            "6" : "6 石の暖炉 「パンを焼く」のアクションのたびに、小麦最大2までそれぞれ食料4にできる。このカードの獲得のとき、追加アクションで「パンを焼く」ができる。",
            "7" : "7 製陶所 収穫のたびにレンガ最大1を食料2にできる。ゲーム終了時にレンガ3/5/7でそれぞれ1/2/3点のボーナスを得る。",
            "8" : "8 家具製作所 収穫のたびに木材最大1を食料2にできる。ゲーム終了時に木材3/5/7でそれぞれ1/2/3点のボーナスを得る。",
            "9" : "9 かご製作所 収穫のたびに葦最大1を食料3にできる。ゲーム終了時に葦2/4/5でそれぞれ1/2/3点のボーナスを得る。",
            "10" : "10 井戸 これ以降の5ラウンドのスペースにそれぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。",
            "11" : "11 畑 このカードを出したらすぐ畑を最大1つ耕す。 コスト: 食1 移動進歩",
            "12" : "12 釣竿 「漁」のアクションのたびに、追加で食料1を得る。ラウンド8からは追加で食料2を得る。 コスト: 木1",
            "13" : "13 斧 木の家の増築はいつも木材2と葦2でできる。 コスト: 木1・石1",
            "14" : "14 パン焼き暖炉 「パンを焼く」のアクションのたびに、小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」アクションができる。 コスト: 暖炉1枚を返す",
            "15" : "15 パン焼き桶 レンガ暖炉と石の暖炉が小さい進歩になり好きな資材1つ安くなる。木の暖炉も資材1つ安くなる。 コスト: 木1",
            "16" : "16 建築資材 このカードを出したらすぐ木材１かレンガ1を得る。 移動進歩",
            "17" : "17 風車小屋 パンを焼かずにいつでも小麦1を食料2にできる。 コスト: 木3・石1",
            "18" : "18 マメ畑 種まきで、このカードの上に畑と同じように野菜を植えられる。（このカードは得点計算で畑に含めない） 条件: 職業2",
            "19" : "19 三つ足やかん かまど○の進歩で2つの品物を食料にするたびに食料をもう1つ得る。 コスト: レ2",
            "20" : "20 簡易かまど 以下の品をいつでも食料にできる。野菜：2　羊：1　猪：2　牛：3　「パンを焼く」のアクションで、小麦：2 コスト: レ1",
            "21" : "21 木骨の小屋 ゲーム終了時に石の家の広さ1スペースにつき、ボーナス1点を得る。（ヴィラと両方持っている場合、ヴィラのボーナスのみ得る。） コスト: 木1・レ1・葦1・石2",
            "22" : "22 いかだ 「漁」のアクションのたびに追加の食料1か葦1を得る。 コスト: 木2",
            "23" : "23 かいば桶 ゲーム終了時に、牧場の広さの合計が6/7/8/9マス以上で、ボーナス1/2/3/4点を得る。 コスト: 木2",
            "24" : "24 檻 これ以降のラウンドのスペース全部にそれぞれ食料2を置く。これらのラウンドのはじめにその食料を得る。 コスト: 木2 条件: 職業4",
            "25" : "25 スパイス かまど○の進歩カードで野菜を食料にするたびに追加で食料1を得る。",
            "26" : "26 かんな 家具製作所・製材所・家具職人で、木材1を食料に換えると追加で食料1を得る。あるいは木材をもう1つ払って食料2に換えられる。 コスト: 木1",
            "27" : "27 木の暖炉 「パンを焼く」のアクションのたびにいくつでも小麦1つにつき食料3にできる。このカードを出してすぐに追加で「パンを焼く」アクションができる。 コスト: 木3・石1",
            "28" : "28 木のスリッパ ゲーム終了時に、レンガの家でボーナス1点、石の家でボーナス2点を得る。 コスト: 木1",
            "29" : "29 角笛 厩の有無に関わらず、羊のいる牧場はそれぞれ追加で2頭まで飼える。柵で囲んでいない厩は羊2頭まで飼える。（この効果は家畜庭、動物園にも適用される） 条件: 羊1",
            "30" : "30 カヌー 「漁」のアクションのたびに、追加で食料1と葦1を得る。 コスト: 木2 条件: 職業2",
            "31" : "31 鯉の池 これ以降の奇数ラウンドのスペースに、それぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 条件: 職業1・進歩2",
            "32" : "32 じゃがいも掘り 種をまくたびに、野菜を新しく植えた畑全部にもう1つ野菜を置く。 コスト: 木1",
            "33" : "33 陶器 このカードを出すとすぐに食料2を得る。今後、製陶所は小さい進歩になり無料で作れる。 コスト: レ1 条件: 暖炉1",
            "34" : "34 かご スペースから木材を取るアクションのたびに、木材2をそのスペースに残して食料3を得ることができる。 コスト: 葦1",
            "35" : "35 穀物スコップ 「小麦を取る」のアクションのたびに、小麦をもう1つ得る。 コスト: 木1",
            "36" : "36 レンガの屋根 増築か改築をするとき、葦1または2を同数のレンガで代用できる。 条件: 職業1",
            "37" : "37 レンガの柱 レンガの家を増築するたびに、レンガ5と葦2をレンガ2と木材1と葦1で代用できる。 コスト: 木2",
            "38" : "38 聖マリア像 効果なし。（捨てた進歩カードによって得られるはずだった品物は全てなくなる） コスト: プレイ済み進歩2",
            "39" : "39 露店 このカードを出したらすぐ野菜1を得る。 コスト: 麦1 移動進歩",
            "40" : "40 小牧場 このカードを出したらすぐ1スペースを柵で囲んで牧場にする。（柵のコストの木材は不要） コスト: 食2 移動進歩",
            "41" : "41 石臼 パンを焼いて小麦を食料にするたびに、追加で食料2を得る。（パンを焼くアクション1回につき食糧2） コスト: 石1",
            "42" : "42 親切な隣人 このカードを出したらすぐ、石材1か葦1を得る。 コスト: 木1/レ1 移動進歩",
            "43" : "43 果物の木 ラウンド8-14のうちまだ始まっていないラウンドのスペースに、それぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 条件: 職業3",
            "45" : "45 個人の森 これ以降の偶数ラウンドのスペースに、それぞれ木材1を置く。これらのラウンドのはじめにその木材を得る。 コスト: 食2",
            "46" : "46 荷車 ラウンド5・8・11・14のうちまだ始まっていないラウンドのスペースに、それぞれ小麦1を置く。これらのラウンドのはじめにその小麦を得る。 コスト: 木2 条件: 職業2",
            "47" : "47 レタス畑 このカードの上に種まきのとき畑と同じように野菜を植えられる。ここから収穫してすぐに食料にすると食料4になる。（このカードは得点計算で畑に含めない） 条件: 職業3",
            "48" : "48 葦の池 これ以降の3ラウンドのスペースにそれぞれ葦1を置く。これらのラウンドのはじめにその葦を得る。 条件: 職業3",
            "49" : "49 書き机 「職業」のアクションで、2つの職業を続けて出せる。2枚目の職業を出すには、1枚目のコストに加えてさらに食料2を支払う。 コスト: 木1 条件: 職業2",
            "50" : "50 へら 「改築」のアクションなしに、木の家をいつでもレンガの家に改築できる。（資材は支払う） コスト: 木1",
            "51" : "51 糸巻き棒 収穫で畑フェイズのたび羊を3匹持っていれば食料1、5匹持っていれば食料2を得る。 コスト: 木1",
            "52" : "52 厩 このカードを出したらすぐ厩を1つ無料で建てる。 コスト: 木1 移動進歩",
            "53" : "53 撹乳器 収穫で畑フェイズのたびに羊がいれば羊3匹につき食料1を得る。同じく牛がいれば牛2匹につき食料1を得る。 コスト: 木2",
            "54" : "54 石切り場 「日雇い労働者」のアクションのたびに、追加で石材3を得る。 条件: 職業4",
            "55" : "55 石の家増築 このカードを出したらすぐ、石の家が1スペース増築される。 コスト: 葦1・石3 移動進歩",
            "56" : "56 石ばさみ ラウンド5-7か、ラウンド10-11で登場する「石材」のアクションのたびに、石材をもう1つ得る。 コスト: 木1",
            "57" : "57 ハト小屋 ラウンド10-14のうちまだ始まっていないラウンドのスペースに、それぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 コスト: 石2",
            "58" : "58 家畜庭 このカードの上に好きな動物を2頭置ける。種類が異なっていても良い。（このカードは得点計算で牧場に含めない） コスト: 木2 条件: 職業1",
            "59" : "59 水飲み場 厩の有無に関わらず、自分の牧場は全て家畜が2頭多く入るようになる。（この効果は家畜庭、動物園にも適用される） コスト: 木2",
            "60" : "60 家畜市場 このカードを出したらすぐ牛1を得る。 コスト: 羊1 移動進歩",
            "61" : "61 鋤車 ゲーム中2回、「畑を耕す」か「畑を耕して種をまく」アクションで、畑を3つまで耕せる。 コスト: 木4 条件: 職業3",
            "62" : "62 折り返し鋤 ゲーム中1回、「畑を耕す」か「畑を耕して種をまく」アクションで、畑を3つまで耕せる。 コスト: 木3 条件: 職業2",
            "338" : "338 強力餌 収穫で食料供給フェイズのたびに、野菜1（最大1つまで）で自分の農場にいる家畜を1匹増やす。",
            "44" : "44 離れのトイレ 効果なし。他の人の中に、職業2つ未満の人がいるときのみに建てられる。 コスト: 木1・レ1",
            "63" : "63 突き鋤 ゲーム中に2回、「畑を耕す」のアクションで耕せる畑が１つから2つになる。「畑を耕して種をまく」のアクションでは使えない。 コスト: 木2 条件: 職業1",
            "64" : "64 喜捨 このカードを出した時点で、既に終わっているラウンド数だけ食料を得る。 条件: 職業なし 移動進歩",
            "65" : "65 パン焼き部屋 「パンを焼く」のアクションのたびに小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」のアクションができる。 コスト: 暖炉1枚を返す・石2",
            "66" : "66 村の井戸 これ以降の3ラウンドのスペースにそれぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 コスト: 井戸を返す",
            "67" : "67 脱穀そり 「畑を耕す」か「畑を耕して種をまく」のアクションのたびに追加で「パンを焼く」のアクションが行える。 コスト: 木2 条件: 職業2",
            "68" : "68 馬鍬 ゲーム中に1回だけ、「畑を耕す」か「畑を耕して種をまく」のアクションで耕せる畑が1つから2つになる。他の人もゲーム中に1回だけ、手番にあなたに食料2を払って同じことができる。 コスト: 木2",
            "69" : "69 イチゴ花壇 これ以降3ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 野菜畑2",
            "70" : "70 地固め機 他の人が馬鍬か鋤類を使うたびに、すぐに畑1つを耕せる。 コスト: 木1",
            "71" : "71 別荘 ラウンド14で家族を一切使えない。このカードはラウンド13までに出すこと。 コスト: （木3/レ3）・葦2",
            "72" : "72 ガチョウ池 これ以降4ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 職業3",
            "73" : "73 ゲスト このカードを出したらゲストトークンを取り、次のラウンドに家族として1回だけ使用できる。 コスト: 食2 移動進歩",
            "74" : "74 小麦車 「小麦1を取る」のアクションのたびに、追加で小麦2を得る。 コスト: 木2 条件: 職業2",
            "75" : "75 手挽き臼 収穫で食糧供給フェイズのたびに小麦1を食料2にするか、小麦2を食料4にできる。 コスト: 石1",
            "76" : "76 くまで ゲーム終了時に畑が5つ以上あればボーナス2点を得る。くびき・馬鍬・地固め機・鋤類のいずれかを出していれば畑が6つ必要。 コスト: 木1",
            "77" : "77 牧人の杖 区切られていない4スペース以上の牧場を新たに囲むたびに、その牧場に羊2頭を置く。 コスト: 木1",
            "78" : "78 雑木林 「種をまく」のアクションのたびに、このカードの上に木材を植えることができる。最大2つまで植えることができる。木材は畑の小麦のように扱い、畑フェイズで収穫する。（このカードは得点計算で畑に数えない） コスト: 木2 条件: 職業1",
            "79" : "79 木材荷車 アクションで木材を取るたびに、追加で木材2を得る。（この効果は木材が累積するスペースから木材を得た時のみ） コスト: 木3 条件: 職業3",
            "80" : "80 林 他の人が「木材3」のアクションを行うたびに、その中から1つをもらう。 コスト: 木1 条件: 職業3",
            "81" : "81 木の家増築 このカードを出したらすぐ木の家が1部屋増える。 コスト: 葦1・木5",
            "82" : "82 木のクレーン ラウンド5-7とラウンド10-11で登場する「石材1」のアクションのたびに、追加で石材1を得る。そのとき食料1を払えば追加分が石材1から石材2になる。 コスト: 木3",
            "83" : "83 林道 最も価値の高い道を持っている人（自分以外の場合も）は得点計算でボーナス2点を得る。 コスト: 木1",
            "84" : "84 鶏小屋 これ以降の8ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 コスト: （木2/レ2）・葦1",
            "85" : "85 調理コーナー 以下の品をいつでも食料にできる。野菜：4　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3 コスト: 調理場を返す",
            "86" : "86 乾燥小屋 畑フェイズの後で空いている畑があれば、すぐに小麦を植えられる。ただし置く小麦は1つ少なくなる。 コスト: （木2/レ2）・葦2",
            "87" : "87 かめ 誰かが井戸を作るか村の井戸に改良するたびに、他の人は食料1、自分は食料4を得る。（すでに井戸がある場合はカードを出したときに得る） コスト: レ1",
            "88" : "88 投げ縄 家族を続けて2人置ける。ただしそのうち少なくとも1人は「猪1」「牛1」「羊1」のいずれかに置くこと。 コスト: 葦1",
            "89" : "89 レンガ道 最も価値の高い道を持っている人（自分以外の場合も）は得点計算でボーナス2点を得る。 コスト: レ3",
            "90" : "90 プランター 家と接する畑に種をまくたびに、その畑に追加で小麦2か野菜1が置かれる。 条件: 職業2　",
            "91" : "91 はしご 増築や改築、水車・木骨の小屋・鶏小屋・別荘・ヴィラ・乾燥小屋を作るたびに、コストの葦を1つ減らせる。 コスト: 木2",
            "92" : "92 堆肥 収穫しないラウンドの最後でも、全ての畑から小麦1か野菜1を取ることができる。（収穫する場合は全ての畑から収穫しなければならない） 条件: 家畜2",
            "93" : "93 酪農場 収穫で畑フェイズのたびに、はじめに全員の農場にいる全ての羊と牛を数える。羊5頭、牛3頭につきそれぞれ食料1を得る。 コスト: レ2・石3",
            "94" : "94 舗装道路 最も価値の高い道を持っている人（自分以外の場合も）は得点計算でボーナス2点を得る。 コスト: 石5",
            "95" : "95 梁 「漁」か葦を取るアクションのたびに追加で食料1を得る。 コスト: 木1",
            "96" : "96 葦の交換 このカードを出したらすぐに葦2を得る。 コスト: 木2/レ2 移動進歩",
            "97" : "97 畜殺場 他の人が家畜を1頭以上、食料にするたびにストックから食料1を得る。食糧供給フェイズでは手番が最後になる。 コスト: レ2・石2",
            "98" : "98 火酒製造所 収穫で食糧供給フェイズのたびに野菜最大1を食料4にできる。ゲーム終了時に5つ目と6つ目の野菜1つにつき、それぞれボーナス1点を得る。 コスト: 野1・石2",
            "99" : "99 わら小屋 増築や改築を行うときに、葦がもう不要になる。 条件: 小麦畑3",
            "100" : "100 酒場 このカードは追加のアクションスペースになる。ここで他の人がアクションを行うと食料3を得る。自分でアクションを行うと、食料3かボーナス2点のどちらかを得る。 コスト: 木2・石2",
            "101" : "101 家畜の餌 得点計算の直前に、1匹以上所有している家畜の種類ごとに1匹ずつ増える。（農場内に置き場所が必要） 条件: 栽培中の畑4",
            "102" : "102 動物園 このカードの上に羊と猪と牛を各1頭ずつまでおくことができる。（このカードは得点計算で牧場に含めない） コスト: 木2 条件: 職業2",
            "103" : "103 水車 全員が畑フェイズのたびに小麦最大1を食料3にできる。他の人がこれを行ったら、その中から食料1をもらう。 コスト: 木1・レ2・葦1・石2",
            "104" : "104 週末市場 このカードを出したらすぐに野菜2を得る。 コスト: 麦3 移動進歩",
            "337" : "337 レンガ置き場 このカードは全員が使えるアクションスペースになる。ここを使うと持ち主に食料1を払ってストックからレンガ5を得る。持ち主が使うとレンガ5か2点を得る。 条件: 職業3",
            "105" : "105 平地 種をまくとき、畑2つに植えるようにしてこのカードの上に小麦2を植えることができる。（このカードは得点計算で畑に含めない） 条件: 職業1",
            "106" : "106 パン焼き小屋 「パンを焼く」のアクションのたびに小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」のアクションができる。 コスト: 暖炉1枚を返す・石3",
            "107" : "107 建築用木材 このカードを出したらすぐに、木材3を得る。 コスト: 石1 移動進歩",
            "108" : "108 ミツバチの巣 これ以降の偶数ラウンドのスペースに、それぞれ食料を2つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 進歩2・職業3",
            "109" : "109 焼き串 収穫で食糧供給フェイズのたびに家畜を1頭以上食料にすると、追加で食料1を得る。 コスト: 木1",
            "110" : "110 醸造所 収穫で食糧供給フェイズのたびに、小麦最大1を食料3にできる。ゲーム終了時に収穫した小麦が9つ以上あればボーナス1点を得る。 コスト: 麦2・石2",
            "111" : "111 パン焼き棒 職業を出すたびに、続けて「パンを焼く」のアクションができる。 コスト: 木1",
            "112" : "112 本棚 職業を1つ出すたびに食料3を得る。この食料は、その職業を出すコストに使用できる。 コスト: 木1 条件: 職業3",
            "113" : "113 脱穀棒 「畑を耕す」か「畑を耕して種をまく」のアクションのたびに追加で「パンを焼く」のアクションができる。 コスト: 木1 条件: 職業1",
            "114" : "114 鴨の池 これ以降の3ラウンドのスペースに食料をそれぞれ1つずつ置く。これらのラウンドの最初にその食料を得る。 条件: 職業2",
            "115" : "115 耕運鋤 ゲーム中2回、「畑を耕す」のアクションで、畑を3つまで耕せる。「畑を耕して種をまく」のアクションでは使えない。 コスト: 木3 条件: 職業3",
            "116" : "116 穀物倉庫 ラウンド8・10・12のうちまだ始まっていないラウンドのスペースに小麦を1つずつ置く。これらのラウンドのはじめにその小麦を得る。 コスト: 木3/レ3",
            "117" : "117 温室 現在のラウンドに4と7を足す。そのラウンドのスペースにそれぞれ野菜を1つずつ置き、ラウンドのはじめに食料1を払えばその野菜を得る。 コスト: 木2 条件: 職業1",
            "118" : "118 肥溜め 種まきで毎回、新しく植えた畑に小麦1か野菜1を追加で置く。 条件: 家畜4",
            "119" : "119 鉤型鋤 ゲーム中1回、「畑を耕す」のアクションで、畑を3つまで耕せる。「畑を耕して種をまく」のアクションでは使えない。 コスト: 木3 条件: 職業1",
            "120" : "120 ヤギ 食糧供給フェイズのたびに食糧1を得る。自分の家にはこのヤギ以外の動物を飼えなくなる。（調教師があっても不可）",
            "121" : "121 木挽き台 自分の牧場におく次の厩と3・6・9・12・15本目の柵は無料になる。（柵は牧場を完全に囲む形でしか置けない） コスト: 木2",
            "122" : "122 製材所 収穫のたびに、木材最大1を食料3にできる。ゲーム終了時に木材2/4/5でそれぞれ1/2/3点のボーナスを得る。（この後にまた家具製作所を獲得してもボーナス点はない） コスト: 家具製作所を返す",
            "123" : "123 木の宝石箱 ゲーム終了時、家の広さが5部屋なら2点、6部屋なら4点のボーナスを得る。 コスト: 木1",
            "124" : "124 くびき このカードを出すとすぐに、場に出ている全ての鋤類の数だけ畑を耕せる。（自分で出している分は数えない） コスト: 木1 条件: 牛1",
            "125" : "125 ほうき 手札の小さい進歩を全て捨て、新たに7枚引く。そしてすぐにコストを支払い、1枚実行できる。 コスト: 木1",
            "126" : "126 柄付き網 アクションで葦を取るたび、追加で食料2を得る。葦以外に他の資材も同時に取る場合は、追加で食料1を得る。 コスト: 葦1",
            "127" : "127 がらがら 「家族を増やす」のアクションのたびに（またはこのカードを出したラウンドに新しい家族が生まれていたら）、小麦が1つ以上ある畑にさらに小麦1を置く。 コスト: 木1",
            "128" : "128 調理場 以下の品をいつでも食料にできる。野菜：3　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3 コスト: かまどを返す",
            "129" : "129 穀物の束 このカードを出したらすぐに小麦1を得る。 移動進歩",
            "130" : "130 薬草畑 これ以降の5ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 野菜畑1",
            "131" : "131 レンガ坑 「日雇い労働者」のアクションのたびに、追加でレンガ3を得る。 条件: 職業3",
            "132" : "132 レンガの家増築 このカードを出すとすぐに、レンガの家が1部屋増築される。 コスト: 葦1・レ4 移動進歩",
            "133" : "133 搾乳台 収穫の畑フェイズのたびに牛を1/3/5頭持っていればそれぞれ食料1/2/3を得る。ゲーム終了時に牛2頭につきボーナス1点を得る。 コスト: 木1 条件: 職業2",
            "134" : "134 牛車 このカードを出したらすぐ、まだ始まっていないラウンドの数だけ（ただし最大3まで）畑を耕せる。 コスト: 木3 条件: 牛2",
            "135" : "135 ウマ ゲーム終了時、1種類の動物を1頭も持っていなかったら、ボーナス2点を得る。（いない家畜の代わりとして扱う。ただし、このカードの効果で家畜一種を補完した状態では、職業カード『村長』のボーナスを獲得できない。）",
            "136" : "136 柴屋根 増築や改築で、葦1か2を同数の木材に変えられる。 条件: 職業2",
            "138" : "138 葦の家 まだ登場していない家族コマをこのカードの上に置き、ゲーム終了時までここに住む。今のラウンドからアクションに使うことができ、食糧供給しなければならず、得点にならない。（後から「家族を増やす」のアクションで家に入れることができる） コスト: 木1・葦4",
            "139" : "139 寝室 他の人の家族が置いてあっても、家族を増やすアクションに家族を置いて実行できる。 コスト: 木1 条件: 小麦畑2",
            "140" : "140 白鳥の湖 これ以降の5ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 職業4",
            "142" : "142 石車 これ以降の偶数ラウンドのスペースに石材をそれぞれ1つずつ置く。これらのラウンドの最初にその石材を得る。 コスト: 木2 条件: 職業2",
            "143" : "143 石の交換 このカードを出したらすぐに、石材2を得る。 コスト: 木2/レ2 移動進歩",
            "144" : "144 ヴィラ ゲーム終了時、石の家1部屋につきボーナス2点を得る。（木骨の小屋とヴィラを持っている場合、ボーナス得点はヴィラのみになる） コスト: 木3・レ3・葦2・石3",
            "145" : "145 森の牧場 このカードの上に猪を何匹でも置ける。（このカードは得点計算で牧場に含めない） 条件: 職業3",
            "146" : "146 織機 畑フェイズのたびに羊を1/4/7頭持っていれば、それぞれ食料1/2/3を得る。ゲーム終了時に羊3頭につき1点のボーナスを得る。 コスト: 木2 条件: 職業2",
            "339" : "339 毛皮 食料にして共通のストックに戻した家畜1頭につき、食料1を自分のストックから取って部屋に置く。各部屋1食料ずつ置ける。この食料はもはや使うことができないが、ゲーム終了時にそれぞれボーナス1点に数える。 条件: 職業3",
            "137" : "137 カブ畑 種まきで、このカードの上に畑と同じように野菜を植えることができる。このカードを出したとき、追加で「種をまく」のアクションができる。（このカードは得点計算で畑に含めない） 条件: 職業3",
            "141" : "141 猪の飼育 このカードを出したらすぐに、猪1を得る。 コスト: 食1 移動進歩",
            "150" : "150 パン職人 収穫のたびにパン○の付いた進歩カードがあれば、食糧供給フェイズのはじめにパンを焼くことができる。このカードを出したときに、追加アクションとしてパンを焼くことができる。",
            "151" : "151 建築士 家が5部屋以上になったら、ゲーム中に1度だけ好きなタイミングで無料で1部屋増築できる。",
            "153" : "153 托鉢僧 ゲーム終了時に、物乞いカードを2枚まで返すことができ、返したカード分のマイナス点が入らない。",
            "162" : "162 肉屋 暖炉を持っていれば家畜をいつでも以下の割合で食料にできる。羊；2　猪：3　牛：4　",
            "171" : "171 港湾労働者 いつでも木材3をレンガ1か葦1か石材1のいずれかに交換できる。または、レンガ2/葦2/石材2のいずれかを好きな資材1と交換できる。",
            "172" : "172 族長 ゲーム終了時に石の家の1部屋につき1点追加ボーナス。このカードを出すには、追加で食料2が必要。",
            "173" : "173 族長の娘 他の人が「族長」を出したら、コスト無しでこのカードをすぐ出すことができる。ゲーム終了時に石の家なら3点、レンガの家なら1点を追加で得る。",
            "174" : "174 家庭教師 ゲーム終了時、このカードの後に出した職業1枚につき1点のボーナスを得る。",
            "175" : "175 柵管理人 柵を1つ以上置くたびに無料でさらに3つ置くことが出来る。（柵は牧場を完全に囲む形でしか置けない）",
            "176" : "176 木こり アクションで木材を取るたびに、追加で木材1を得る。",
            "179" : "179 販売人 「小さい進歩」か「小さい/大きい進歩」のアクションのたびに、食料1を払えばもう1回このアクションをできる。",
            "184" : "184 小売人 このカードの上に下から野菜・葦・レンガ・木材・野菜・石材・小麦・葦を1つずつ順番に重ねる。食料1でいつでも一番上の商品を買える。",
            "187" : "187 レンガ運び ラウンド6-14のうちまだ始まっていないラウンドのスペースに、1つずつレンガを置く。これらのラウンドのはじめにそのレンガを得る。",
            "188" : "188 レンガ混ぜ アクションでレンガだけを取るたびに、レンガ2を追加で得る。",
            "189" : "189 君主 ゲーム終了時に、各カテゴリーで4点まで到達すれば、それぞれ1点のボーナスを得る。（柵で囲まれた厩を4つ以上作った場合も含む）",
            "190" : "190 メイド レンガの家に住み次第、それ以降のラウンドのスペースに食料1を置く。これらのラウンドの最初にその食料を得る。（すでにレンガか石の家に住んでいれば、すぐに食料を置く）",
            "191" : "191 左官屋 石の家が4部屋以上になったら、1回だけ好きなときに1部屋を無料で増築できる。",
            "194" : "194 鋤職人 石の家を持つと、毎ラウンドのはじめに食料1を払って畑を最大1つ耕すことができる。",
            "195" : "195 鋤鍛冶 「畑を耕す」か「畑を耕して種をまく」のアクションのたびに、食料1で耕す畑を1つ（最大１つまで）追加できる。",
            "196" : "196 キノコ探し アクションスペースにある木材を取るたび、その中から1つ取らずに残して代わりに食料2を得ることができる。",
            "199" : "199 改築屋 レンガの家に改築するときレンガが2つ少なくてよい。石の家に改築するとき石材が2つ少なくてよい。",
            "200" : "200 修理屋 木の家をレンガの家にせず、直接石の家に改築できる。",
            "202" : "202 季節労働者 「日雇い労働者」のアクションのたびに追加で小麦1を得る。ラウンド6からは小麦1でなく野菜1にしてもよい。",
            "207" : "207 厩番 柵を1つ以上置くたびに無料で厩を1つ手に入れすぐに置く。（置く場所は柵の内側でも外側でもよい）",
            "208" : "208 厩作り 柵で囲んでいない厩に、同じ家畜を3匹まで置くことが出来る。",
            "210" : "210 石運び アクションで石材を取るたびに追加でもう1つ得る。石材以外も取るときは、追加の石材を得るのに食料1を払う。",
            "218" : "218 大工 家の資材3と葦2で増築できる。",
            "147" : "147 畑商人 「野菜1を取る」のアクションのたびに追加で小麦1を取る。このカードを出したときにストックから野菜1を得る。",
            "148" : "148 大学者 小さい進歩を使う時や、代官・家庭教師で得点するときに、このカードを職業2つに数える。",
            "152" : "152 イチゴ集め アクションで木材を取るたびに、追加で食料1を得る。",
            "155" : "155 パン屋 誰か（自分も含む）がパンを焼くたびに、食料にした小麦1つにつき食料1を得る。",
            "156" : "156 ブラシ作り 食料にした猪をこのカードの上に置くことが出来る。ゲーム終了時にここの猪が2/3/4頭ならば、それぞれ1/2/3点のボーナスを得る。",
            "157" : "157 屋根がけ 増築・改築・水車・木骨の小屋・鶏小屋・別荘・ヴィラ・乾燥小屋の建設で葦を1つ安くできる。",
            "158" : "158 旋盤職人 いつでも木材を食料にできる。木材1につき食料1。",
            "161" : "161 漁師 漁のアクションのたびにそこに置いてある食料の2倍を得る。ただし釣竿・いかだ・カヌー・梁・柄付き網の所有者がいたらそれぞれ食料1ずつ与える。",
            "165" : "165 自由農夫 ゲーム終了時に、未使用の農場スペースと物乞いだけがマイナス点になる。",
            "168" : "168 八百屋 「小麦1を取る」のアクションのたびに追加で野菜1を得る。",
            "170" : "170 大農場管理人 ゲーム終了時に3種類の家畜のそれぞれで自分より多い人がいなければ、3/4/5人プレイでそれぞれ2/3/4点ボーナスを得る。",
            "177" : "177 木大工 ゲーム終了時に、木の部屋1部屋につきボーナス1点を得る。",
            "182" : "182 炭焼き 自分か他の人がパンを焼く進歩（パン○）を行うたびに食料1と木材1を得る。（パンが焼かれる度ではなく、該当する進歩カードが場に出た瞬間）",
            "197" : "197 ほら吹き ゲーム終了時に、自分の前にある進歩カード5/6/7/8/9枚に対して、それぞれ1/3/5/7/9点ボーナスを得る。",
            "198" : "198 ネズミ捕り ラウンド10・12に他の人は全員、新しい家族のうち1人を置くことが出来ない。このカードは9ラウンド終了時までにしか出せない。（「新しい家族」とは3-5番目の家族の事を指す）",
            "205" : "205 葦集め これ以降の4ラウンドのスペースに葦を1つずつ置く。これらのラウンドのはじめにその葦を得る。",
            "209" : "209 石持ち いつでも石材を食料にできる。石材1につき食料2。",
            "211" : "211 石切り 大小の進歩・増築・改築全部が石材1安くなる。",
            "214" : "214 陶工 収穫で、毎回レンガ最大1を食料2にできる。",
            "217" : "217 代官 カードを出した時点で残りラウンド数が1/3/6/9ならば、それぞれ木材1/2/3/4を得る。ゲーム終了時に職業を一番多く持っている人は全員3点ボーナスを得る。",
            "341" : "341 ギルド長 家具製作所か家具職人を出すとすぐ木材4を得る。製陶所か陶工を出すとすぐレンガ4を得る。かご製作所かかご編みを出すとすぐ葦3を得る。ギルド長を出したとき、これらのカードをすでに出していれば対応する資材を2つ得る。",
            "149" : "149 パン焼き長老 自分がパン○のついた設備を持っていれば、他の人がパンを焼くたびパンを焼ける。自分で焼くときは追加で食料1を得る。",
            "159" : "159 家長 「増築」と「家族を増やす」が含まれるアクションを、他の人がすでに選んでいても行える。",
            "160" : "160 農場主 次に柵を作るとき、猪1を得る。それ以降、柵を1本以上作るたびに牛1を得る。",
            "163" : "163 畑守 「野菜1を取る」「畑1を耕す」「畑1を耕し種をまく」のアクションを、他の人がすでに選んでいてもそのアクションスペースを使って行える。",
            "164" : "164 営林士 3人ゲームから「木材2」のアクションカードを追加する。各ラウンドのはじめに木材2をその上に置く。この森を使う人から食料2をもらう。",
            "166" : "166 庭職人 「日雇い労働者」のアクションのたびに、追加で野菜1を得る。",
            "167" : "167 奇術師 「小劇場」のアクションのたびに、追加で小麦1を得る。",
            "169" : "169 昔語り 「小劇場」のアクションのたびに食料1をそのスペースに残して、代わりに野菜1を得る。",
            "178" : "178 小屋大工 ラウンド1-4に出せば、第11ラウンドのはじめに無料で1スペース増築できる。（石の家を除く）",
            "180" : "180 小さい庭師 このカードを出したときに野菜1を得る。さらに空いている畑があればこの野菜を植えることができる。",
            "181" : "181 コック 収穫で食糧供給フェイズのたびに、食糧2を食べる家族は2人だけになり、残りの家族は全員食料1で満足する。",
            "183" : "183 かご編み 収穫のたび、葦1（最大１つまで）を食料3にできる。",
            "185" : "185 レンガ焼き いつでもレンガを石材にできる。レンガ2につき石材1、レンガ3につき石材2に換える。",
            "186" : "186 レンガ屋 いつでもレンガ2を羊1か葦1に、レンガ3を猪1か石材1に、レンガ4を牛1にできる。",
            "192" : "192 パトロン これ以降職業を出すたびに、食料2を得る。この食料は今出した職業のコストの支払いに当てても良い。",
            "193" : "193 牧師 このカードを出したときか、それ以降に、家の広さが2部屋しかないのが自分だけである場合、1度だけ木材3・レンガ2・葦1・石材1を得る。",
            "201" : "201 牛使い 現在のラウンドに5と9を足す。そのラウンドのスペースにそれぞれ牛を1つずつ置き、そのラウンドのはじめにその牛を得る。",
            "203" : "203 羊飼い 収穫で繁殖フェイズのたびに、羊4頭以上あれば、子羊1頭ではなく2頭得る。ただし子羊のための場所が必要。",
            "204" : "204 羊飼い親方 これ以降の3ラウンドのスペースにそれぞれ羊1を置く。これらのラウンドのはじめにその羊を得る。",
            "206" : "206 ブタ飼い 「猪1」のアクションのたびに、猪をもう1頭得る。",
            "212" : "212 踊り手 「小劇場」のアクションのたびに、食料が1-3しか置いてなくても食料4を得る。",
            "213" : "213 家畜の世話人 2つ目の厩を建てると牛1、3つ目の厩で猪1、4つ目の厩で羊1を得る。（1度にいくつも建てた場合、その分だけ家畜を得る）",
            "215" : "215 家畜小作人 羊、豚、牛を各1頭ずつすぐにストックから借りる。得点計算の前に各1頭ずつ返す。返さなかった家畜1頭につき1点を失う。",
            "216" : "216 家畜守 同じ牧場の中に羊・猪・牛を飼える。自分の牧場全てに適用する。（ただし森の牧場を除く）",
            "154" : "154 醸造師 収穫で食糧供給フェイズのたびに、小麦1（最大1つまで）を食料3にできる。",
            "219" : "219 畑農 種をまくときに畑を1つだけにすると、その畑に小麦か野菜を追加で2つ置く。畑を2つにすると、小麦か野菜を追加で1つ置く。",
            "220" : "220 井戸掘り 「井戸」は大きな進歩ではなく小さな進歩になり石材1と木材1だけで作ることができる。",
            "225" : "225 畑番 「小麦1を取る」のアクションのたびに追加で畑を最大1つ耕せる。",
            "226" : "226 庭師 野菜畑から収穫するたびに、野菜を畑からではなくストックから取る。畑の野菜はそのままにしておく。",
            "227" : "227 共同体長 残りラウンド数が1/3/6/9ならば、すぐに木材1/2/3/4を得る。ラウンド14で5人以上の家族をアクションに使った人は全員、ゲーム終了時にボーナス3点を得る。（ゲスト、葦の家の住人も数える）",
            "231" : "231 召使 石の家に住んだら、すぐこれ以降のラウンドスペース全てに食料を3つずつ置く。これらのラウンドのはじめにその食料を得る。（カードを出したときすでに石の家に住んでいたらすぐ食料を並べる）",
            "233" : "233 農場管理 レンガか石の家に住み次第、次に増やす家族1人は部屋がいらなくなる。（それ以降の家族は通常通り）",
            "235" : "235 木材集め これ以降の5ラウンドのスペースに木材を1つずつ置く。これらのラウンドのはじめにその木材を得る。",
            "238" : "238 収入役 ラウンド11から、自分だけそれ以降のラウンドで使うラウンドカードのアクションも選べる。これらのカードは早くともラウンド11のはじめから表にしてボード上に置かれる。",
            "241" : "241 レンガ積み 木の家をレンガの家に改築するコストはレンガ1と葦1でよい。またレンガの家の増築は1部屋につきレンガ3と葦2になる。",
            "242" : "242 レンガ大工 レンガの家に住んだらすぐにこれ以降の5ラウンドのスペースにレンガを2つずつ置く。これらのラウンドのはじめにそのレンガを得る。（カードを出したときすでにレンガや石の家に住んでいたらすぐレンガを並べる）",
            "243" : "243 レンガ貼り 進歩と改築はレンガ1つ少なくできる。さらに増築はレンガ2つ少なくできる。",
            "244" : "244 居候 このカードを出した次の収穫を完全にスキップする。",
            "247" : "247 精肉屋 いつでも家畜を以下の割合で食料にできる。羊：1　猪：2　牛：3",
            "248" : "248 網漁師 葦を取るアクションのたび、帰宅フェイズで「漁」のアクションスペースにある食料を全部取る。",
            "256" : "256 石工 収穫のたび、石材1（最大１つまで）を食料3にできる。",
            "262" : "262 水運び 誰かが大きい進歩の「井戸」を作ったら、それ以降のラウンドのスペース全てに1つずつ食料を置く。それらのラウンドの最初にその食料を得る。（すでに井戸ができていたらすぐに食料を並べる）",
            "263" : "263 柵立て このカードを出したら自分の柵を1本好きなアクションに置く。自分がそのアクションを選ぶたび、追加で柵を置くアクションもできる。",
            "265" : "265 柵運び 現在のラウンドに6と10を足す。そのラウンドのスペースそれぞれに自分の柵を4本ずつ置き、ラウンドのはじめに食料2を払って4本全部を立てることができる。（木材は払わなくて良い）",
            "221" : "221 村の長老 カードを出した時点で残りラウンド数が1/3/6/9ラウンドならばすぐに、それぞれ木材1/2/3/4を得る。ゲーム終了時に進歩を一番多く出している人は全員3点ボーナスを得る。",
            "223" : "223 収穫手伝い 収穫のたび、食糧供給フェイズのはじめに誰か1人の畑1つから小麦1をとれる。相手は代わりに食料2をストックからとれる。",
            "224" : "224 畑作人 他の人が種をまくたびに3人ゲームでは小麦1、それ以外は食料1を得る。",
            "228" : "228 商人 「スタートプレイヤー」のアクションを選ぶたび、小さい進歩の後にもう一度小さい/大きい進歩ができる。",
            "234" : "234 材木買い付け人 他の人がアクションで木材を取るたびに（同意無しに）木材1を食料1（最大1つまで）で買い取れる。",
            "236" : "236 小作人 ゲーム終了時に未使用の土地スペース1つにつき食料1を支払えばマイナス点にならない。",
            "240" : "240 牛の飼育士 「牛1」のアクションのたびに追加で牛1を得る。",
            "245" : "245 てき屋 「小麦1を取る」のアクションのたびに追加で小麦1と野菜1を得ることができる。そのとき他の人は全員、小麦1をストックから得る。",
            "258" : "258 家具職人 収穫のたび、木材最大1を食料2にできる。",
            "259" : "259 家畜追い 「羊1」「猪1」「牛1」のアクションを行うたび、食料1を払って同じ種類の家畜をもう1頭得ることができる。",
            "222" : "222 成り上がり 1番にレンガの家や石の家に改築したらそれぞれ石材3を得る。2番目なら石材2、3番目なら石材1を得る。（カードを出す前に効果は遡らない）",
            "229" : "229 ごますり 「小麦1を取る」のアクションを行う人から前もって食料1をもらう。さらにストックから食料1を得る。自分が得るときもストックから追加で食料1を得る。",
            "230" : "230 穴掘り 3人ゲームから「レンガ1」を追加する。その上にすぐにレンガ3を置き、各ラウンドのはじめにレンガ1をその上に置く。このアクションを使う人から食料3をもらう。",
            "232" : "232 産婆 他の人が家族を増やすたび、その家族が自分より多いとストックから食料1を得る。2人以上多ければ食料2を得る。",
            "237" : "237 旅芸人 「小劇場」のアクションのたびにおいてある食料の2倍を得る。ただし曲芸師・猛獣使い・奇術師・昔語り・人形使い・街頭の音楽家・踊り手・魔術使いがいればそれぞれ食料1ずつ与えなければならない。",
            "239" : "239 脱穀職人 いつでも小麦１を食料3にできる。他の人は食料2を出してその小麦を買取りこの行動を無効にできる。複数名乗り出たら選んでよい。",
            "246" : "246 乳搾り 収穫のたび、畑フェイズで牛1/3/5頭がいれば、それぞれ食料1/2/3を得る。ゲーム終了時に牛2頭につき1点ボーナスを得る。",
            "249" : "249 人形使い 他の人が「小劇場」のアクションを行うたびに食料1を払って職業1を出せる。",
            "250" : "250 羊使い 現在のラウンドに4・7・9・11を足す。そのラウンドにそれぞれ羊を1つずつ置き、ラウンドはじめにその羊を得る。",
            "251" : "251 葦買い付け人 毎ラウンド、最初に葦をとった人に食料最大1を支払い葦1を（同意無しに）買い取ることができる。相手はさらにストックから食料1を得る。",
            "252" : "252 猪飼い 置ける場所があればラウンド12の最後でも猪が繁殖する。このカードを出したらすぐに猪1を得る。",
            "253" : "253 猪猟師 アクションで木材を取るたびに、その中から2つ残して代わりに猪1を得る。",
            "254" : "254 馬手 石の家に住み次第、毎ラウンドのはじめに厩のアクションに家族を置かずに木材1で厩1（最大1つまで）を建てられる。",
            "255" : "255 石買い付け人 毎ラウンド、最初に石材をとった人に食料最大1を支払い石材1を（同意無しに）買い取ることができる。相手はさらにストックから食料1を得る。",
            "257" : "257 街頭の音楽家 他の人が「小劇場」のアクションを行うたびに、小麦1を得る。",
            "260" : "260 毒見役 他の人がスタートプレイヤーのたび、ラウンドのはじめにその人に食料1を払えば最初に家族を1人置ける。その後スタートプレイヤーから通常通りに置く。",
            "261" : "261 乗馬従者 今出たばかりのラウンドカードのアクションを行うたびに追加で小麦1を得る。",
            "264" : "264 柵作り 他の人が柵を1-4本立てるたびストックから木材1を得る。5本以上立てれば木材2を得る。",
            "340" : "340 農夫 毎ラウンドのはじめ（フェイズ1の前）に他の人より農場を多く使用していたら木材1を得る。",
            "267" : "267 養父母 食料1を払えば増やしたばかりの新しい家族でアクションができる。その場合、新しい家族は新生児には含めない。",
            "268" : "268 出来高労働者 アクションで木材・レンガ・葦・石材・小麦のいずれかを手に入れるたびに、食料1で同じものをもう1つ買える。野菜の場合は食料2で買える。",
            "270" : "270 乳母 増築のとき、増築した部屋の数だけすぐに家族を増やせる。家族1人につき食料1を払う。（新生児は次のラウンドになってからアクションに使える。増築した後に部屋のなかった家族がいれば移して、それでもなお空き部屋がある場合のみ有効）",
            "272" : "272 梁打ち 改築でレンガ1や石材1（最大1）を木材1で代用できる。増築ではレンガ2や石材2（最大2）を木材1で代用できる。",
            "274" : "274 有機農業者 ゲーム終了時に、家畜が1頭以上いて、かつまだ3頭以上入れられる牧場1つにつき1点のボーナスを得る。（森の牧場も含む）",
            "278" : "278 林務官 「種をまく」のアクションを行うたびにこのカードの上に木材を3つまで植えられる。小麦畑と同じように扱い、畑フェイズで収穫する。",
            "279" : "279 学者 石の家に住み次第、毎ラウンドのはじめに食料1で職業カードを出すかコストを払って小進歩カードを出せる。",
            "281" : "281 行商人 「小さい進歩1」のアクションのたびに、小さい進歩の代わりに大きい進歩ができる。「大きい進歩または小さい進歩1」では小さい進歩を2枚出せる。",
            "283" : "283 木材運び ラウンド8-14のうち、まだ始まっていないラウンドのスペースに木材を1つずつ置く。これらのラウンドのはじめにその木材を得る。",
            "284" : "284 木材配り 毎回ラウンドのはじめに「木材3」にある木材をその下の「レンガ1」「葦1」「漁」のマスに同じ数ずつ分けることができる。このカードを出したときに木材2を得る。このカードの効果で木材が配られたアクションスペースは「木材が累積するスペース」とみなす。",
            "286" : "286 小農夫 家畜2頭分だけの牧場に3頭飼えるようになる。持っている畑が全部で2つ以下なら、種をまくたびに小麦か野菜が1つ増える。",
            "290" : "290 レンガ職人 アクションで木材かレンガを取るたびに、追加でレンガ1を得る。",
            "292" : "292 露天商の女 アクションや小さい進歩で野菜を取るたびに、追加で小麦2を得る。",
            "293" : "293 鋤手 現在のラウンドに4・7・10を足す。そのラウンドのスペースにそれぞれ畑を1つずつ置き、これらのラウンドのはじめに食料1を払えばその畑を自分の農場における。",
            "300" : "300 火酒作り 収穫で食糧供給フェイズのたびに、野菜最大1を食料5にできる。",
            "301" : "301 彫刻家 進歩1・木の家の増築1・厩・柵のいずれかで、1ラウンドに1回、払う木材を1つ少なくできる。",
            "306" : "306 調教師 自分の家のどの部屋にも家畜を1頭ずつ置ける。種類が別でも良い。",
            "312" : "312 柵見張り 毎ラウンド1回だけ、建てた厩1つまでを即座に食料1を払うことで柵で囲み、1スペースの牧場にできる。柵のコストの木材は払わなくて良い。これは未使用スペースが牧場になったものとみなす。",
            "276" : "276 村長 カードを出した時点で残りラウンド数が1/3/6/9ならば、それぞれ木材1/2/3/4を得る。ゲーム終了時にマイナス点がない人は全員5点のボーナスを得る。",
            "277" : "277 工場主 レンガか石の家に住み次第、家具製造所・製陶所・かご製作所は小さい進歩になり好きな資源2つ少なく作ることが出来る。",
            "280" : "280 革なめし工 食料にした猪と牛をこのカードの上に置く。ゲーム終了時に畜殺した猪が2/4/6頭または牛が2/3/4頭ならばそれぞれ1/2/3点のボーナスを得る。",
            "282" : "282 執事 カードを出した時点で残りラウンド数が1/3/6/9ならば、それぞれ木材1/2/3/4を得る。ゲーム終了時に家が一番広い人は全員3点のボーナスを得る。",
            "285" : "285 ブリキ職人 いつでもレンガを食料にできる。レンガ1につき食料1。誰かが井戸を作ればレンガ2につき食料3にできる。（村の井戸でも可）",
            "291" : "291 愛人 このカードを出したらすぐ「家族を増やす（部屋がなくてもよい）」のアクションを行う。このカードを出すのにコストとして追加で食料4が必要。",
            "294" : "294 柴結び 改築と増築で必要な葦を木材1で代用できる。",
            "296" : "296 種屋 「小麦1を取る」のアクションで追加で小麦1を取る。このカードを出したとき小麦1を得る。",
            "297" : "297 羊番 石の家に住み次第これ以降のラウンドのスペースに羊を1頭ずつ置く。これらのラウンドのはじめにその羊を得る。（カードを出したときすでに石の家ならばすぐに羊を置く）",
            "299" : "299 畜殺人 他の人が家畜を食料にするたびに、（食料にした頭数にかかわらず）食料1をストックから得る。食糧供給フェイズでは手番を最後に行う。",
            "266" : "266 畑好き 「種をまいてパンを焼く」のアクションのたびにアクションの前に小麦1を得る。あるいは手持ちの小麦1を野菜1と交換できる。",
            "269" : "269 曲芸師 「小劇場」のアクションのたび、他の人全員が家族を置き終わったあとで、小劇場に置いた家族を「畑1を耕す」か「小麦1を取る」か「畑1を耕して種をまく」のアクションのいずれかに（空いていれば）移動してそのアクションを行うことができる。",
            "271" : "271 職業訓練士 他の人が職業を出すたびに、食料3を払えば自分も職業1を出せる。4枚目以降の職業は食料2だけでよい。",
            "273" : "273 骨細工 食料にした猪1頭につき自分の木材2までをこのカードの上に置ける。1･4･7･10番目の木材を除きこのカードの上にある木材1につき1点のボーナスを得る。",
            "275" : "275 ぶらつき学生 職業を出すときに、職業カードの手札から誰かに引いてもらって出すことができる。そのたびに食料3を受け取り、その職業を出すのに払ってもよい。",
            "287" : "287 倉庫主 ラウンドのはじめに石材5以上持っていれば石材1、葦6以上で葦1、レンガ7以上でレンガ1、木材8以上で木材1を得る。",
            "288" : "288 倉庫番 1つのアクションで葦と石材の両方を取るたびに、追加でレンガ1か小麦1を得る。",
            "289" : "289 営農家 全員が家族を置いた後、「小麦1を取る」か「野菜1を取る」に家族を置いていれば、「種をまく」か「種をまいてパンを焼く」のアクションのどちらかに（空いていれば）移動してそのアクションを行うことが出来る。",
            "295" : "295 牛飼い 場所があればラウンド12の後にも牛が繁殖する。このカードを出したらすぐ牛1を得る。",
            "298" : "298 羊農 アクションで羊を取るたびに、追加で羊1をストックから得る。いつでも（繁殖フェイズを除く）羊3を牛1と猪1に交換できる。",
            "302" : "302 猪使い 現在のラウンドに4･7･10を足す。そのラウンドのスペースにそれぞれ猪1ずつ置き、ラウンドのはじめにその猪を得る。",
            "303" : "303 石打ち 「改築」のアクションなしで、いつでもレンガの家を石の家に改築できる。（ただし資材は払う）",
            "304" : "304 獣医 このカードを出したとき白いマーカー4、黒いマーカー3、茶色のマーカー2を取って袋の中に入れる。各ラウンドのはじめに2つ引く。同じなら1つを袋に戻して、同じ色の家畜を1頭得る。同じでなければ2つとも袋に戻す。",
            "305" : "305 家畜主 まだ始まっていなければラウンド7に羊1、ラウンド10に猪1、ラウンド14に牛1を置く。これらのラウンドのはじめに食料1でその家畜を買える。",
            "307" : "307 家畜飼い 未使用の土地から新しい牧場を作るたびに、以下のコストで家畜のつがいを1組買える。羊2頭は食料1、猪2頭は食料2、牛2頭は食料3。",
            "308" : "308 職場長 毎ラウンド、労働フェイズのはじめに共通のストックから食料1を取り、好きなアクションスペースに置く。",
            "309" : "309 織工 毎ラウンド、労働フェイズのはじめに羊2頭以上持っていれば、食料1を得る。",
            "311" : "311 魔術使い 自分の家族の最後の1人を「小劇場」のアクションに置くたびに、追加で小麦1と食料1を得る。",
            "342" : "342 猛獣使い 「小劇場」で取った食料ですぐに家畜を入手できる。羊1頭につき食料2、猪1頭につき食料2、牛1頭につき食料3。",
            "310" : "310 資材商人 このカードの上に下から石材・レンガ・石材・レンガ・葦・レンガ・木材を1つずつ順番に重ねる。一番上の品と同じものを他で取るたびに、一番上の品も得る。",
        };

        return json;
    }

})();
