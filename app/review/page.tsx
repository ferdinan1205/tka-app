"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"
import {
MathJax,
MathJaxContext,
} from "better-react-mathjax"

export default function Review(){

const [data,setData]=useState<any>(null)
const [loading,setLoading]=useState(true)
const [aiLoading,setAiLoading]=useState<number|null>(null)

const router=useRouter()

useEffect(()=>{

getLastResult()

},[])


async function getLastResult(){

const {data:userData}=
await supabase.auth.getUser()

if(!userData.user){

router.push("/login")
return

}

const {data}=await supabase
.from("hasil")
.select("*")
.eq(
"user_id",
userData.user.id
)
.order(
"id",
{ascending:false}
)
.limit(1)

setData(data?.[0]||null)

setLoading(false)

}



async function generateAI(
index:number,
item:any
){

try{

setAiLoading(index)

const res=
await fetch(
"/api/ai",
{
method:"POST",
headers:{
"Content-Type":
"application/json"
},
body:JSON.stringify({
soal:item.soal,
jawaban_benar:
item.jawaban_benar
})
}
)

const result=
await res.json()

const updated=[
...data.detail
]

updated[index]={
...updated[index],
pembahasan:
result.text,
chat:[],
input:""
}

setData({
...data,
detail:updated
})

}catch{

alert(
"Gagal generate AI"
)

}
finally{

setAiLoading(null)

}

}


async function sendChat(
i:number,
item:any
){

if(
!item.input?.trim()
)return

const updated=[
...data.detail
]

const text=
item.input

if(
!updated[i].chat
){

updated[i].chat=[]

}

updated[i].chat.push({

role:"user",
text:text

})

updated[i].input=""

setData({
...data,
detail:updated
})

try{

const res=
await fetch(
"/api/ai",
{
method:"POST",
headers:{
"Content-Type":
"application/json"
},
body:JSON.stringify({

soal:item.soal,

pertanyaan:text,

jawaban_benar:
item.jawaban_benar

})
}
)

const result=
await res.json()

updated[i].chat.push({

role:"ai",
text:result.text

})

setData({
...data,
detail:[...updated]
})

}catch{

updated[i].chat.push({

role:"ai",
text:"AI gagal menjawab"

})

setData({
...data,
detail:[...updated]
})

}

}


if(loading){

return(
<div className="p-10">
Loading...
</div>
)

}


if(!data){

return(
<div className="p-10">
Tidak ada data
</div>
)

}

const benar=
data.detail.filter(
(d:any)=>d.benar
).length

const salah=
data.detail.length-
benar

const akurasi=
Math.round(
(
benar/
data.detail.length
)*100
)

return(

<MathJaxContext>

<div className="min-h-screen bg-white">


{/* HEADER */}

<div className="bg-blue-700 text-white p-6">

<div className="flex justify-between">

<div>

<p className="opacity-90">

UJIAN {data.kategori}

</p>

<h1 className="text-4xl font-black">

Review Jawaban

</h1>

</div>

<button
onClick={()=>
router.push(
"/dashboard"
)
}
className="
bg-white
text-blue-700
font-bold
px-5 py-3
rounded-2xl
"
>

Dashboard

</button>

</div>

</div>


<div className="max-w-7xl mx-auto p-6">


{/* CARD */}

<div className="
grid
grid-cols-2
md:grid-cols-4
gap-5
mb-8
">

<Card
title="Skor"
value={data.skor}
bg="bg-blue-100"
color="text-blue-700"
/>

<Card
title="Benar"
value={benar}
bg="bg-green-100"
color="text-green-700"
/>

<Card
title="Salah"
value={salah}
bg="bg-red-100"
color="text-red-700"
/>

<Card
title="Akurasi"
value={`${akurasi}%`}
bg="bg-yellow-100"
color="text-yellow-700"
/>

</div>



{data.detail.map(
(item:any,i:number)=>{

const isEmpty=
!item.pembahasan

return(

<div
key={i}
className="
bg-gray-50
border
rounded-3xl
shadow
p-6
mb-6
"
>


{/* SOAL */}

<div className="
flex
justify-between
mb-5
">

<div>

<span className="
bg-blue-600
text-white
px-4 py-2
rounded-full
font-bold
">

Soal {i+1}

</span>


<div className="
mt-5
text-gray-800
text-lg
font-semibold
leading-9
">

<MathJax dynamic>

{item.soal}

</MathJax>

</div>

</div>


<span className={`

px-4
py-2
rounded-full
font-bold

${

item.benar

?

"bg-green-200 text-green-700"

:

"bg-red-200 text-red-700"

}

`}>

{

item.benar

?

"✔ Benar"

:

"✖ Salah"

}

</span>

</div>


{/* JAWABAN */}

<div className="
flex
gap-3
flex-wrap
mb-5
">

<div className="
bg-red-100
text-red-700
font-semibold
px-4 py-3
rounded-2xl
">

Jawaban Kamu :

{item.jawaban_user||"-"}

</div>


<div className="
bg-green-100
text-green-700
font-semibold
px-4 py-3
rounded-2xl
">

Jawaban Benar :

{item.jawaban_benar}

</div>

</div>


{/* AI */}

{isEmpty?

<button
onClick={()=>
generateAI(
i,
item
)
}
className="
bg-blue-700
hover:bg-blue-800
text-white
font-bold
px-5 py-3
rounded-2xl
"
>

{

aiLoading===i

?

"⏳ AI sedang berpikir..."

:

"✨ Generate AI Pembahasan"

}

</button>

:

<div className="space-y-5">


<div className="
bg-blue-50
border
border-blue-200
rounded-3xl
p-5
">

<h2 className="
font-bold
text-blue-900
text-xl
mb-3
">

📘 Pembahasan AI

</h2>

<div className="
text-gray-800
font-medium
leading-9
">

<MathJax dynamic>

{item.pembahasan}

</MathJax>

</div>

</div>


<div className="
bg-white
border
rounded-3xl
p-5
">

<h2 className="
font-bold
text-blue-800
text-xl
mb-4
">

💬 Tanya AI

</h2>


<div className="
h-[250px]
overflow-y-auto
bg-gray-50
rounded-2xl
p-4
space-y-4
mb-4
">

{
item.chat?.map(
(msg:any,index:number)=>(

<div
key={index}
className={`

flex

${
msg.role==="user"
?
"justify-end"
:
"justify-start"
}

`}
>

<div
className={`

max-w-[80%]
px-4 py-3
rounded-2xl

${
msg.role==="user"

?

"bg-blue-600 text-white"

:

"bg-white border text-gray-900"

}

`}
>

<MathJax dynamic>

{msg.text}

</MathJax>

</div>

</div>

))
}

</div>


<div className="flex gap-3">

<input
value={
item.input||""
}
onChange={(e)=>{

const updated=[
...data.detail
]

updated[i].input=
e.target.value

setData({
...data,
detail:updated
})

}}
placeholder="Tanyakan sesuatu..."
className="
flex-1
border
rounded-2xl
p-4
text-gray-900
font-medium
"
/>

<button
onClick={()=>
sendChat(
i,
item
)
}
className="
bg-blue-700
text-white
px-6
rounded-2xl
font-bold
"
>

Kirim

</button>

</div>

</div>

</div>

}

</div>

)

})

}

</div>

</div>

</MathJaxContext>

)

}


function Card({

title,
value,
bg,
color

}:any){

return(

<div className={`
${bg}
rounded-3xl
p-6
text-center
shadow
`}>

<h1 className={`
${color}
font-black
text-4xl
`}>

{value}

</h1>

<p className="
text-gray-700
mt-2
font-medium
">

{title}

</p>

</div>

)

}